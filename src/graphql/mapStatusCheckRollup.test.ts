import { describe, expect, it } from "vitest";
import { mapStatusCheckRollup, isVisiblePrCiState } from "@/graphql/mapStatusCheckRollup";

describe("mapStatusCheckRollup", () => {
  it("maps SUCCESS to success", () => {
    expect(mapStatusCheckRollup("SUCCESS")).toEqual({ state: "success", totalCount: 1 });
  });

  it("maps FAILURE and ERROR to failure", () => {
    expect(mapStatusCheckRollup("FAILURE")).toEqual({ state: "failure", totalCount: 1 });
    expect(mapStatusCheckRollup("ERROR")).toEqual({ state: "failure", totalCount: 1 });
  });

  it("maps PENDING and EXPECTED to pending", () => {
    expect(mapStatusCheckRollup("PENDING")).toEqual({ state: "pending", totalCount: 1 });
    expect(mapStatusCheckRollup("EXPECTED")).toEqual({ state: "pending", totalCount: 1 });
  });

  it("maps null/undefined to none", () => {
    expect(mapStatusCheckRollup(null)).toEqual({ state: "none", totalCount: 0 });
    expect(mapStatusCheckRollup(undefined)).toEqual({ state: "none", totalCount: 0 });
  });

  it("maps unknown values to none", () => {
    expect(mapStatusCheckRollup("UNKNOWN")).toEqual({ state: "none", totalCount: 0 });
  });
});

describe("isVisiblePrCiState", () => {
  it("hides none state", () => {
    expect(isVisiblePrCiState("none")).toBe(false);
  });

  it("shows actionable states", () => {
    expect(isVisiblePrCiState("success")).toBe(true);
    expect(isVisiblePrCiState("failure")).toBe(true);
    expect(isVisiblePrCiState("pending")).toBe(true);
  });
});
