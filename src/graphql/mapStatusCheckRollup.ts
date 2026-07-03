import type { PrCiState, PrCiStatus } from "@/github/types";

export type StatusCheckRollupState =
  | "EXPECTED"
  | "ERROR"
  | "FAILURE"
  | "PENDING"
  | "SUCCESS"
  | null
  | undefined;

export function mapStatusCheckRollup(
  state: StatusCheckRollupState | string | null | undefined,
): PrCiStatus {
  if (!state) {
    return { state: "none", totalCount: 0 };
  }
  switch (state) {
    case "SUCCESS":
      return { state: "success", totalCount: 1 };
    case "FAILURE":
    case "ERROR":
      return { state: "failure", totalCount: 1 };
    case "PENDING":
    case "EXPECTED":
      return { state: "pending", totalCount: 1 };
    default:
      return { state: "none", totalCount: 0 };
  }
}

export function isVisiblePrCiState(state: PrCiState): boolean {
  return state !== "none";
}
