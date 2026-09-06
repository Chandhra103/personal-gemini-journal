import { describe, expect, it } from "vitest";
import { assertUserNamespace, sanitizeUntrustedText, userNamespace } from "./services/security";

describe("journal security boundaries", () => {
  it("removes control characters and bounds untrusted input", () => {
    const value = sanitizeUntrustedText("  hello\u0000\u0007\nworld  ", 8);
    expect(value).toBe("hello\nwo");
    expect(sanitizeUntrustedText("x".repeat(20), 10)).toHaveLength(10);
  });

  it("builds the canonical user namespace", () => {
    expect(userNamespace("firebase-user-123")).toBe("users/firebase-user-123");
  });

  it("rejects a request that tries to cross a user namespace", () => {
    expect(() => assertUserNamespace("user-a", "user-b")).toThrow("USER_NAMESPACE_MISMATCH");
    expect(() => assertUserNamespace("user-a", "user-a")).not.toThrow();
  });
});
