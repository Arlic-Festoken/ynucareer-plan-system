import { describe, expect, it } from "vitest";
import { apiUrl, routerBasename } from "./base";

describe("deployment base paths", () => {
  it("joins root and subpath API prefixes without duplicate slashes", () => {
    expect(apiUrl("/auth/session", "/api")).toBe("/api/auth/session");
    expect(apiUrl("healthz", "/career-api/")).toBe("/career-api/healthz");
  });

  it("converts Vite public bases into React Router basenames", () => {
    expect(routerBasename("/")).toBeUndefined();
    expect(routerBasename("/career/")).toBe("/career");
  });
});
