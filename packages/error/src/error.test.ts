import { describe, expect, it } from "vitest";
import {
  ComplianceError,
  ConflictError,
  DomainError,
  ExternalServiceError,
  FinancialError,
  InfrastructureError,
  isRelckoError,
  PermissionError,
  RelckoError,
  SecurityError,
  toRelckoError,
  ValidationError,
} from "@relcko/error";

describe("error hierarchy", () => {
  it("produces typed errors with category + http status", () => {
    const cases: RelckoError[] = [
      new DomainError("d"),
      new ValidationError("v", [{ path: "a", message: "bad" }]),
      new PermissionError("p"),
      new ComplianceError("c"),
      new FinancialError("f"),
      new SecurityError("s"),
      new InfrastructureError("i"),
      new ExternalServiceError("e", "stripe"),
      new ConflictError("x"),
    ];
    expect(cases.map((e) => e instanceof RelckoError)).toEqual([true, true, true, true, true, true, true, true, true]);
    expect(new ValidationError("v").issues).toHaveLength(0);
    expect(new ExternalServiceError("e", "stripe").service).toBe("stripe");
    expect(cases.every((e) => typeof e.httpStatus === "number")).toBe(true);
  });

  it("serializes safely", () => {
    const json = new PermissionError("denied", "DENIED", { action: "invest" }).toJSON();
    expect(json.category).toBe("permission");
    expect(json.metadata).toEqual({ action: "invest" });
  });

  it("coerces unknown throws into RelckoError", () => {
    expect(isRelckoError(toRelckoError(new Error("x")))).toBe(true);
    expect(toRelckoError("str").message).toBe("str");
    expect(toRelckoError(new DomainError("d")).code).toBe("DOMAIN_VIOLATION");
  });
});
