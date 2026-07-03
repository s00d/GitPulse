import { initGraphQLTada } from "gql.tada";
import type { introspection } from "./graphql-env";

export const graphql = initGraphQLTada<{
  introspection: introspection;
  scalars: {
    DateTime: string;
    URI: string;
    HTML: string;
    GitObjectID: string;
    BigInt: string;
    PreciseDateTime: string;
  };
}>();

export type { FragmentOf, ResultOf, VariablesOf } from "gql.tada";
export { readFragment } from "gql.tada";
