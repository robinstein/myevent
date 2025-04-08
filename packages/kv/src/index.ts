import Redis from "ioredis";

// Create a single Redis connection with optimized settings
export const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  retryStrategy(times) {
    return Math.min(times * 50, 2000); // Exponential backoff with max 2s
  },
});

export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get(key);
    return cached ? (JSON.parse(cached) as T) : null;
  } catch {
    return null;
  }
}

export async function setToCache<T>(
  key: string,
  value: T,
  ttl: number
): Promise<boolean> {
  try {
    const pipeline = redis.pipeline();
    pipeline.set(key, JSON.stringify(value));
    pipeline.expire(key, ttl);
    await pipeline.exec();
    return true;
  } catch (err) {
    console.error("Cache set error:", err);
    return false;
  }
}

export async function deleteFromCache(key: string): Promise<boolean> {
  try {
    await redis.del(key);
    return true;
  } catch {
    return false;
  }
}

export interface CacheOptions {
  ttl?: number;
  key: string;
}

export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl = 3600
): Promise<T> {
  const cached = await getFromCache<T>(key);
  if (cached) {
    return cached;
  }

  const fresh = await fn();
  await setToCache(key, fresh, ttl);
  return fresh;
}
