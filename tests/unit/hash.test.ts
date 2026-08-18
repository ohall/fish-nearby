import { describe, expect, it } from "vitest";

import { canonicalizeJson, hashPayload } from "@/server/ingestion/hash";

describe("canonicalizeJson", () => {
  it("sorts object keys recursively", () => {
    const a = canonicalizeJson({ b: 1, a: { d: 2, c: 3 } });
    const b = canonicalizeJson({ a: { c: 3, d: 2 }, b: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":{"c":3,"d":2},"b":1}');
  });

  it("preserves array order", () => {
    expect(canonicalizeJson([3, 1, 2])).toBe("[3,1,2]");
  });
});

describe("hashPayload", () => {
  it("produces a stable 64-char lowercase hex digest", () => {
    const hash = hashPayload({ hello: "world" });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is insensitive to key order", () => {
    expect(hashPayload({ a: 1, b: 2 })).toBe(hashPayload({ b: 2, a: 1 }));
  });

  it("differs for different payloads", () => {
    expect(hashPayload({ a: 1 })).not.toBe(hashPayload({ a: 2 }));
  });
});
