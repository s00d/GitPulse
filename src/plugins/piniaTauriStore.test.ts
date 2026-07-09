import { describe, expect, it } from "vitest";
import { omitEphemeralKeys } from "./piniaTauriStore";

describe("omitEphemeralKeys", () => {
  it("drops github session flags from persisted state", () => {
    expect(
      omitEphemeralKeys("github", {
        isLoading: true,
        isBootstrapped: true,
        lastRefreshed: "2026-01-01T00:00:00.000Z",
      }),
    ).toEqual({
      lastRefreshed: "2026-01-01T00:00:00.000Z",
    });
  });

  it("leaves other stores untouched", () => {
    const state = { isLoading: true };
    expect(omitEphemeralKeys("settings", state)).toBe(state);
  });
});
