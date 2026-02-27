const windowMs = 60 * 1000;
const defaultLimit = 60;

type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

export function consumeRateLimit(key: string, limit = defaultLimit) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: limit - 1, reset: now + windowMs };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, reset: bucket.reset };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, reset: bucket.reset };
}
