import { describe, expect, it } from "vitest";
import { EnvLoader, memoryEnvSource, MissingEnvError } from "@relcko/env";

describe("env loader", () => {
  it("reads required and optional values", () => {
    const env = new EnvLoader(memoryEnvSource({ NODE_ENV: "production", APP_NAME: "relcko" } as never));
    expect(env.require("NODE_ENV")).toBe("production");
    expect(env.optional("MISSING", "fallback")).toBe("fallback");
  });

  it("throws on missing required", () => {
    const env = new EnvLoader(memoryEnvSource({} as never));
    expect(() => env.require("NOPE")).toThrow(MissingEnvError);
  });

  it("parses booleans and numbers and enums", () => {
    const env = new EnvLoader(memoryEnvSource({ B: "true", N: "42", E: "staging" } as never));
    expect(env.requireBoolean("B")).toBe(true);
    expect(env.optionalNumber("N", 0)).toBe(42);
    expect(env.requireEnum("E", ["dev", "staging", "prod"])).toBe("staging");
    expect(() => env.requireEnum("E", ["dev"])).toThrow();
  });
});
