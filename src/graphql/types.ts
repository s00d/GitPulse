import type { TadaDocumentNode } from "gql.tada";
import type { GraphqlResponse } from "@/graphql/execute";

export type { FragmentOf, ResultOf, VariablesOf } from "@/graphql/github";

/** gql.tada document + variables pair for a typed GraphQL request. */
export interface GithubGraphqlRequest<TData, TVariables extends Record<string, unknown>> {
  document: TadaDocumentNode<TData, TVariables>;
  variables: TVariables;
}

export type GithubGraphqlResponse<TData> = GraphqlResponse<TData>;
