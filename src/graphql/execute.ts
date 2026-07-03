import { type DocumentNode } from "graphql";
import type { TadaDocumentNode } from "gql.tada";
import type { GitHubClient } from "@/github/client";

export type GithubGraphqlClient = Pick<GitHubClient, "graphqlDocument">;

export interface GraphqlError {
  message?: string;
}

export interface GraphqlResponse<TData> {
  data?: TData;
  errors?: GraphqlError[];
}

export interface GraphqlPointRateLimit {
  cost: number;
  remaining: number;
  limit: number;
}

export interface ExecuteGithubGraphqlOptions {
  onRateLimit?: (info: GraphqlPointRateLimit) => void;
}

export function assertGraphqlData<TData>(
  response: GraphqlResponse<TData>,
  fallbackMessage: string,
): TData {
  if (response.errors?.length) {
    const message = response.errors
      .map((error) => error.message)
      .filter(Boolean)
      .join("; ");
    throw new Error(message || fallbackMessage);
  }
  if (!response.data) {
    throw new Error(fallbackMessage);
  }
  return response.data;
}

type WithRateLimit<T> = T & { rateLimit?: GraphqlPointRateLimit | null };

export async function executeGithubGraphql<TData, TVariables extends Record<string, unknown>>(
  client: GithubGraphqlClient,
  document: TadaDocumentNode<TData, TVariables> | DocumentNode,
  variables: TVariables,
  fallbackMessage: string,
  options?: ExecuteGithubGraphqlOptions,
): Promise<TData> {
  const response = await client.graphqlDocument<WithRateLimit<TData>, TVariables>(
    document as TadaDocumentNode<TData, TVariables>,
    variables,
  );
  const data = assertGraphqlData(response, fallbackMessage);
  if (data.rateLimit) {
    options?.onRateLimit?.(data.rateLimit);
  }
  const { rateLimit: _rateLimit, ...rest } = data;
  return rest as TData;
}
