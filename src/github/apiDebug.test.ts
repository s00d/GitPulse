import { describe, expect, it } from "vitest";
import {
  formatApiDebugPath,
  formatDebugJson,
  redactHeaders,
  truncateForDebug,
} from "@/github/apiDebug";

describe("apiDebug helpers", () => {
  it("redacts authorization headers", () => {
    expect(
      redactHeaders({
        Authorization: "Bearer secret-token",
        Accept: "application/json",
      }),
    ).toEqual({
      Authorization: "Bearer ***",
      Accept: "application/json",
    });
  });

  it("truncates large debug payloads", () => {
    const large = { items: "x".repeat(40_000) };
    const result = truncateForDebug(large, 100);
    expect(result.truncated).toBe(true);
    expect(String(result.value)).toContain("…");
  });

  it("formats debug json", () => {
    expect(formatDebugJson({ ok: true })).toBe('{\n  "ok": true\n}');
  });

  it("formats api path from full url", () => {
    expect(formatApiDebugPath("https://api.github.com/search/issues?q=is:open")).toBe(
      "/search/issues?q=is:open",
    );
  });
});
