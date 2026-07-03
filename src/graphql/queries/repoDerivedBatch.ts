import type { GithubGraphqlClient } from "@/graphql/execute";
import type {
  GitHubDiscussionItem,
  GitHubMilestone,
  GitHubRelease,
} from "@/github/types";
import { parseRepoFull, type RepoRef } from "@/graphql/batch/repoSlots";
import { RepoDerivedFieldsFragment } from "@/graphql/fragments/repoDerivedFields";
import { DiscussionListItemFragment } from "@/graphql/fragments/discussionListItem";
import { MilestoneListItemFragment } from "@/graphql/fragments/milestoneListItem";
import { ReleaseListItemFragment } from "@/graphql/fragments/releaseListItem";
import { executeGithubGraphql, type ExecuteGithubGraphqlOptions } from "@/graphql/execute";
import { readFragment, type FragmentOf } from "@/graphql/github";
import { mapGraphqlDiscussion } from "@/graphql/mapDiscussion";
import { mapGraphqlMilestone } from "@/graphql/mapMilestone";
import { mapGraphqlRelease } from "@/graphql/mapRelease";
import {
  buildRepoDerivedBatchVariables,
  repoDerivedBatchEntries,
  type RepoDerivedBatchSectionFlags,
} from "@/graphql/batch/repoDerivedBatchVars";
import {
  REPO_DERIVED_BATCH_SLOTS,
  RepoDerivedBatchQuery,
  type RepoDerivedBatchAlias,
} from "@/graphql/queries/repoDerivedBatch.query";

export type { RepoDerivedBatchSectionFlags };
export {
  REPO_DERIVED_BATCH_SLOTS,
  DISCUSSIONS_PER_REPO,
  MILESTONES_PER_REPO,
  RELEASES_PER_REPO,
} from "@/graphql/queries/repoDerivedBatch.query";

export const REPO_DERIVED_CHUNK_SIZE = REPO_DERIVED_BATCH_SLOTS;

export interface RepoDerivedBatchResult {
  releases: Array<{ repo: string; releases: GitHubRelease[] }>;
  discussions: GitHubDiscussionItem[];
  milestones: Array<{ repo: string; milestones: GitHubMilestone[] }>;
}

export interface FetchRepoDerivedBatchOptions extends ExecuteGithubGraphqlOptions {
  sections?: RepoDerivedBatchSectionFlags;
}

type ReleaseBatchNode = FragmentOf<typeof ReleaseListItemFragment>;
type DiscussionBatchNode = FragmentOf<typeof DiscussionListItemFragment>;
type MilestoneBatchNode = FragmentOf<typeof MilestoneListItemFragment>;

function mapRepoDerivedResponse(
  aliases: ReadonlyArray<RepoDerivedBatchAlias | null | undefined>,
  repos: RepoRef[],
  sections: RepoDerivedBatchSectionFlags,
): RepoDerivedBatchResult {
  const includeReleases = sections.includeReleases ?? true;
  const includeDiscussions = sections.includeDiscussions ?? true;
  const includeMilestones = sections.includeMilestones ?? true;

  const releaseResults: Array<{ repo: string; releases: GitHubRelease[] }> = [];
  const discussions: GitHubDiscussionItem[] = [];
  const milestoneResults: Array<{ repo: string; milestones: GitHubMilestone[] }> = [];

  for (let index = 0; index < repos.length; index += 1) {
    const repo = repos[index]!;
    const alias = aliases[index];
    const fields = alias ? readFragment(RepoDerivedFieldsFragment, alias) : null;
    if (!fields) {
      if (includeReleases) releaseResults.push({ repo: repo.fullName, releases: [] });
      if (includeMilestones) milestoneResults.push({ repo: repo.fullName, milestones: [] });
      continue;
    }

    if (includeReleases) {
      const releaseNodes = (fields.releases?.nodes ?? []) as Array<ReleaseBatchNode | null | undefined>;
      const releases = releaseNodes
        .map((node: ReleaseBatchNode | null | undefined) =>
          node ? mapGraphqlRelease(readFragment(ReleaseListItemFragment, node)) : null,
        )
        .filter((release): release is GitHubRelease => release != null);
      releaseResults.push({ repo: repo.fullName, releases });
    }

    if (includeDiscussions) {
      const discussionNodes = (fields.discussions?.nodes ?? []) as Array<
        DiscussionBatchNode | null | undefined
      >;
      for (const node of discussionNodes) {
        if (!node) continue;
        discussions.push(
          mapGraphqlDiscussion(readFragment(DiscussionListItemFragment, node), repo.fullName),
        );
      }
    }

    if (includeMilestones) {
      const milestoneNodes = (fields.milestones?.nodes ?? []) as Array<
        MilestoneBatchNode | null | undefined
      >;
      const milestones = milestoneNodes
        .map((node: MilestoneBatchNode | null | undefined) =>
          node ? mapGraphqlMilestone(readFragment(MilestoneListItemFragment, node)) : null,
        )
        .filter((milestone): milestone is GitHubMilestone => milestone != null);
      milestoneResults.push({ repo: repo.fullName, milestones });
    }
  }

  return { releases: releaseResults, discussions, milestones: milestoneResults };
}

export async function fetchRepoDerivedBatch(
  client: GithubGraphqlClient,
  repoFullNames: string[],
  options?: FetchRepoDerivedBatchOptions,
): Promise<RepoDerivedBatchResult> {
  const { sections = {}, ...graphqlOptions } = options ?? {};
  const repos = repoFullNames
    .map((repo) => parseRepoFull(repo))
    .filter((repo): repo is RepoRef => repo != null);

  if (!repos.length) {
    return { releases: [], discussions: [], milestones: [] };
  }

  const releases: Array<{ repo: string; releases: GitHubRelease[] }> = [];
  const discussions: GitHubDiscussionItem[] = [];
  const milestones: Array<{ repo: string; milestones: GitHubMilestone[] }> = [];

  for (let offset = 0; offset < repos.length; offset += REPO_DERIVED_BATCH_SLOTS) {
    const chunk = repos.slice(offset, offset + REPO_DERIVED_BATCH_SLOTS);
    const slots = Array.from({ length: REPO_DERIVED_BATCH_SLOTS }, (_, index) => chunk[index]);

    const data = await executeGithubGraphql(
      client,
      RepoDerivedBatchQuery,
      buildRepoDerivedBatchVariables(slots, sections),
      "GraphQL repo derived batch failed",
      graphqlOptions,
    );
    const mapped = mapRepoDerivedResponse(repoDerivedBatchEntries(data), chunk, sections);
    releases.push(...mapped.releases);
    discussions.push(...mapped.discussions);
    milestones.push(...mapped.milestones);
  }

  return { releases, discussions, milestones };
}
