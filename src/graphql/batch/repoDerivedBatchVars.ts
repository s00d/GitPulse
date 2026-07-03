import type { RepoRef } from "@/graphql/batch/repoSlots";
import type {
  RepoDerivedBatchAlias,
  RepoDerivedBatchData,
  RepoDerivedBatchVariables,
} from "@/graphql/queries/repoDerivedBatch.query";
import { REPO_DERIVED_BATCH_SLOTS } from "@/graphql/queries/repoDerivedBatch.query";

export interface RepoDerivedBatchSectionFlags {
  includeReleases?: boolean;
  includeDiscussions?: boolean;
  includeMilestones?: boolean;
}

type RepoSlotKey = Extract<keyof RepoDerivedBatchData, `repo${number}`>;

const REPO_SLOT_KEYS: RepoSlotKey[] = Array.from(
  { length: REPO_DERIVED_BATCH_SLOTS },
  (_, index) => `repo${index}` as RepoSlotKey,
);

export function buildRepoDerivedBatchVariables(
  repos: ReadonlyArray<RepoRef | undefined>,
  sections: RepoDerivedBatchSectionFlags = {},
): RepoDerivedBatchVariables {
  const variables = {} as RepoDerivedBatchVariables;
  variables.skipReleases = !(sections.includeReleases ?? true);
  variables.skipDiscussions = !(sections.includeDiscussions ?? true);
  variables.skipMilestones = !(sections.includeMilestones ?? true);

  for (let index = 0; index < REPO_DERIVED_BATCH_SLOTS; index += 1) {
    const repo = repos[index];
    const record = variables as Record<string, string | boolean>;
    record[`repo${index}Owner`] = repo?.owner ?? "";
    record[`repo${index}Name`] = repo?.name ?? "";
    record[`skipRepo${index}`] = repo == null;
  }

  return variables;
}

export function repoDerivedBatchEntries(
  data: RepoDerivedBatchData,
): Array<RepoDerivedBatchAlias | null | undefined> {
  return REPO_SLOT_KEYS.map((key) => data[key]);
}
