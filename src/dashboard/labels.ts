import type { PrCategoryKind } from "@/github/types";

type TranslateFn = (key: string, params?: Record<string, unknown>) => string;

export function prCategoryLabel(t: TranslateFn, kind: PrCategoryKind, count: number): string {
  switch (kind) {
    case "needsReview":
      return t("dashboard.needsReview") + ` (${count})`;
    case "myPrs":
      return t("dashboard.myPrs") + ` (${count})`;
    case "waitingOnAuthor":
      return t("dashboard.waitingOnAuthor") + ` (${count})`;
  }
}
