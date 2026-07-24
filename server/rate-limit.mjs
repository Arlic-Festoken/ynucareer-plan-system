export function createRateLimiter({ limit, windowMs, now = Date.now }) {
  const attempts = new Map();

  return {
    consume(key) {
      const currentTime = now();
      const active = (attempts.get(key) || []).filter((time) => currentTime - time < windowMs);
      if (active.length >= limit) {
        attempts.set(key, active);
        const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (currentTime - active[0])) / 1_000));
        return { allowed: false, remaining: 0, retryAfterSeconds };
      }
      active.push(currentTime);
      attempts.set(key, active);
      return { allowed: true, remaining: limit - active.length, retryAfterSeconds: 0 };
    },
  };
}
