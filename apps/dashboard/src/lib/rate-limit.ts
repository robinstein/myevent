import {
  createRateLimitResponse,
  getIpAddress,
  type TokenBucketRateLimiter,
} from "@myevent/utils";

/**
 * Apply rate limiting to an API route handler
 *
 * @param rateLimiter - The rate limiter instance to use
 * @param key - The key to use for rate limiting (e.g. IP address)
 */
export async function applyRateLimit(
  rateLimiter: TokenBucketRateLimiter,
  key: string
): Promise<{ response: Response | null; throttled: boolean }> {
  const allowed = await rateLimiter.consume(key);
  if (!allowed) {
    return {
      response: createRateLimitResponse(rateLimiter.getRefillInterval()),
      throttled: true,
    };
  }

  return { response: null, throttled: false };
}

/**
 * Apply IP-based rate limiting to an API route handler
 *
 * @param rateLimiter - The rate limiter instance to use
 * @param headers - The headers to use for rate limiting
 */
export async function applyIpRateLimit(
  rateLimiter: TokenBucketRateLimiter,
  headers: Headers
): Promise<{ response: Response | null; throttled: boolean }> {
  const ip = getIpAddress(headers);

  if (!ip) {
    return {
      response: new Response("IP address not found", { status: 400 }),
      throttled: true,
    };
  }

  return applyRateLimit(rateLimiter, `ip:${ip}`);
}
