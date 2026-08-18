import { createHash } from "node:crypto";

/**
 * Produce a canonical JSON serialization with recursively sorted object keys so
 * that logically identical payloads hash identically regardless of upstream key
 * ordering. This is the stable input to content hashing and must never depend on
 * fetch time or process state.
 */
export function canonicalizeJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      sorted[key] = sortValue(record[key]);
    }
    return sorted;
  }
  return value;
}

/** SHA-256 (lowercase hex) of an arbitrary payload, via canonical JSON. */
export function hashPayload(payload: unknown): string {
  return createHash("sha256")
    .update(canonicalizeJson(payload), "utf8")
    .digest("hex");
}
