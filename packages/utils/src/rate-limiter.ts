import { redis, getFromCache } from "@myevent/kv";

/**
 * Token bucket rate limiter implementation
 * Inspired by Lucia Auth's rate limiter: https://github.com/lucia-auth/example-nextjs-email-password-webauthn/blob/main/lib/server/rate-limit.ts
 */

interface TokenBucketOptions {
  max: number;
  refillIntervalSeconds: number;
}

interface BucketState {
  count: number;
  refilled_at: number;
}

export class TokenBucketRateLimiter {
  private readonly max: number;
  private readonly refillIntervalSeconds: number;
  private readonly namespace: string;

  constructor(namespace: string, options: TokenBucketOptions) {
    this.max = options.max;
    this.refillIntervalSeconds = options.refillIntervalSeconds;
    this.namespace = namespace;
  }

  public async consume(key: string, cost = 1): Promise<boolean> {
    if (cost <= 0) {
      throw new Error("Cost must be greater than 0");
    }

    if (cost > this.max) {
      throw new Error(
        `Cost (${cost}) cannot be greater than maximum tokens (${this.max})`
      );
    }

    const redisKey = this.getRateLimitKey(key);
    const now = Math.floor(Date.now() / 1000);

    try {
      const state = await getFromCache<BucketState>(redisKey);

      if (!state) {
        const expiresInSeconds = cost * this.refillIntervalSeconds;
        const result = await redis
          .multi()
          .set(
            redisKey,
            JSON.stringify({ count: this.max - cost, refilled_at: now }),
            "EX",
            expiresInSeconds
          )
          .exec();

        if (!result) {
          throw new Error("Redis transaction failed");
        }
        return true;
      }

      // Calculate token refill
      const refill = Math.floor(
        (now - state.refilled_at) / this.refillIntervalSeconds
      );
      const newCount = Math.min(state.count + refill, this.max);

      if (newCount < cost) {
        return false;
      }

      // Update bucket using multi
      const finalCount = newCount - cost;
      const expiresInSeconds =
        (this.max - finalCount) * this.refillIntervalSeconds;

      const result = await redis
        .multi()
        .set(
          redisKey,
          JSON.stringify({ count: finalCount, refilled_at: now }),
          "EX",
          expiresInSeconds
        )
        .exec();

      if (!result) {
        throw new Error("Redis transaction failed");
      }

      return true;
    } catch (err) {
      throw new Error(
        `Failed to check rate limit: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  public async getRemainingTokens(key: string): Promise<number> {
    const redisKey = this.getRateLimitKey(key);
    const state = await getFromCache<BucketState>(redisKey);

    if (!state) return this.max;

    const now = Math.floor(Date.now() / 1000);
    const refill = Math.floor(
      (now - state.refilled_at) / this.refillIntervalSeconds
    );

    return Math.min(state.count + refill, this.max);
  }

  private getRateLimitKey(key: string) {
    return `ratelimit:${this.namespace}:${key}`;
  }

  public getRefillInterval(): number {
    return this.refillIntervalSeconds;
  }
}

export class RateLimitExceededError extends Error {
  constructor(message = "Rate limit exceeded") {
    super(message);
    this.name = "RateLimitExceededError";
  }
}
