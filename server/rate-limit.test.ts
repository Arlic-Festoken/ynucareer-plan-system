import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit.mjs";

describe("createRateLimiter", () => {
  it("blocks a key after the configured number of attempts", () => {
    let now = 1_000;
    const limiter = createRateLimiter({ limit: 2, windowMs: 10_000, now: () => now });

    expect(limiter.consume("ip-a")).toMatchObject({ allowed: true, remaining: 1 });
    expect(limiter.consume("ip-a")).toMatchObject({ allowed: true, remaining: 0 });
    expect(limiter.consume("ip-a")).toMatchObject({ allowed: false, remaining: 0 });

    now += 10_001;
    expect(limiter.consume("ip-a")).toMatchObject({ allowed: true, remaining: 1 });
  });

  it("isolates keys and provides a retry delay", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => 5_000 });
    expect(limiter.consume("ip-a").allowed).toBe(true);
    expect(limiter.consume("ip-b").allowed).toBe(true);
    expect(limiter.consume("ip-a")).toMatchObject({ allowed: false, retryAfterSeconds: 60 });
  });
});
