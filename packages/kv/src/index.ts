import "server-only";
import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL!);

async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get(key);
    return cached ? (JSON.parse(cached) as T) : null;
  } catch {
    return null;
  }
}

async function setToCache<T>(
  key: string,
  value: T,
  ttl: number
): Promise<boolean> {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttl);
    return true;
  } catch {
    return false;
  }
}

async function deleteFromCache(key: string): Promise<boolean> {
  try {
    await redis.del(key);
    return true;
  } catch {
    return false;
  }
}

interface CacheOptions {
  ttl?: number;
  key: string;
}

async function withCache<T>(
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

export { getFromCache, setToCache, withCache, deleteFromCache };
export type { CacheOptions };
