import { RepoDerivedFieldsFragment } from "@/graphql/fragments/repoDerivedFields";
import { graphql, type ResultOf, type VariablesOf } from "@/graphql/github";

export const REPO_DERIVED_BATCH_SLOTS = 15 as const;

export {
  DISCUSSIONS_PER_REPO,
  MILESTONES_PER_REPO,
  RELEASES_PER_REPO,
} from "@/graphql/fragments/repoDerivedFields";

export const RepoDerivedBatchQuery = graphql(
  `
    query RepoDerivedBatch(
      $repo0Owner: String!, $repo0Name: String!, $skipRepo0: Boolean!
      $repo1Owner: String!, $repo1Name: String!, $skipRepo1: Boolean!
      $repo2Owner: String!, $repo2Name: String!, $skipRepo2: Boolean!
      $repo3Owner: String!, $repo3Name: String!, $skipRepo3: Boolean!
      $repo4Owner: String!, $repo4Name: String!, $skipRepo4: Boolean!
      $repo5Owner: String!, $repo5Name: String!, $skipRepo5: Boolean!
      $repo6Owner: String!, $repo6Name: String!, $skipRepo6: Boolean!
      $repo7Owner: String!, $repo7Name: String!, $skipRepo7: Boolean!
      $repo8Owner: String!, $repo8Name: String!, $skipRepo8: Boolean!
      $repo9Owner: String!, $repo9Name: String!, $skipRepo9: Boolean!
      $repo10Owner: String!, $repo10Name: String!, $skipRepo10: Boolean!
      $repo11Owner: String!, $repo11Name: String!, $skipRepo11: Boolean!
      $repo12Owner: String!, $repo12Name: String!, $skipRepo12: Boolean!
      $repo13Owner: String!, $repo13Name: String!, $skipRepo13: Boolean!
      $repo14Owner: String!, $repo14Name: String!, $skipRepo14: Boolean!
      $skipReleases: Boolean!
      $skipDiscussions: Boolean!
      $skipMilestones: Boolean!
    ) {
      rateLimit {
        cost
        remaining
        limit
      }
      repo0: repository(owner: $repo0Owner, name: $repo0Name) @skip(if: $skipRepo0) {
        ...RepoDerivedFields
      }
      repo1: repository(owner: $repo1Owner, name: $repo1Name) @skip(if: $skipRepo1) {
        ...RepoDerivedFields
      }
      repo2: repository(owner: $repo2Owner, name: $repo2Name) @skip(if: $skipRepo2) {
        ...RepoDerivedFields
      }
      repo3: repository(owner: $repo3Owner, name: $repo3Name) @skip(if: $skipRepo3) {
        ...RepoDerivedFields
      }
      repo4: repository(owner: $repo4Owner, name: $repo4Name) @skip(if: $skipRepo4) {
        ...RepoDerivedFields
      }
      repo5: repository(owner: $repo5Owner, name: $repo5Name) @skip(if: $skipRepo5) {
        ...RepoDerivedFields
      }
      repo6: repository(owner: $repo6Owner, name: $repo6Name) @skip(if: $skipRepo6) {
        ...RepoDerivedFields
      }
      repo7: repository(owner: $repo7Owner, name: $repo7Name) @skip(if: $skipRepo7) {
        ...RepoDerivedFields
      }
      repo8: repository(owner: $repo8Owner, name: $repo8Name) @skip(if: $skipRepo8) {
        ...RepoDerivedFields
      }
      repo9: repository(owner: $repo9Owner, name: $repo9Name) @skip(if: $skipRepo9) {
        ...RepoDerivedFields
      }
      repo10: repository(owner: $repo10Owner, name: $repo10Name) @skip(if: $skipRepo10) {
        ...RepoDerivedFields
      }
      repo11: repository(owner: $repo11Owner, name: $repo11Name) @skip(if: $skipRepo11) {
        ...RepoDerivedFields
      }
      repo12: repository(owner: $repo12Owner, name: $repo12Name) @skip(if: $skipRepo12) {
        ...RepoDerivedFields
      }
      repo13: repository(owner: $repo13Owner, name: $repo13Name) @skip(if: $skipRepo13) {
        ...RepoDerivedFields
      }
      repo14: repository(owner: $repo14Owner, name: $repo14Name) @skip(if: $skipRepo14) {
        ...RepoDerivedFields
      }
    }
  `,
  [RepoDerivedFieldsFragment],
);

export type RepoDerivedBatchData = ResultOf<typeof RepoDerivedBatchQuery>;
export type RepoDerivedBatchVariables = VariablesOf<typeof RepoDerivedBatchQuery>;
export type RepoDerivedBatchAlias = NonNullable<RepoDerivedBatchData["repo0"]>;
