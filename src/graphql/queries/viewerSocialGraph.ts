import type { GithubGraphqlClient } from "@/graphql/execute";
import type { GitHubSocialUser } from "@/github/types";
import { executeGithubGraphql, type ExecuteGithubGraphqlOptions } from "@/graphql/execute";
import { graphql, type ResultOf } from "@/graphql/github";

const ViewerSocialGraphQuery = graphql(`
  query ViewerSocialGraph($followingFirst: Int!, $followersFirst: Int!) {
    rateLimit {
      cost
      remaining
      limit
    }
    viewer {
      following(first: $followingFirst) {
        nodes {
          login
          avatarUrl
          url
          databaseId
        }
      }
      followers(first: $followersFirst) {
        nodes {
          login
          avatarUrl
          url
          databaseId
        }
      }
    }
  }
`);

type SocialUserNode = NonNullable<
  NonNullable<
    ResultOf<typeof ViewerSocialGraphQuery>["viewer"]["following"]["nodes"]
  >[number]
>;

function mapSocialUser(node: SocialUserNode): GitHubSocialUser {
  return {
    id: node.databaseId ?? 0,
    login: node.login,
    avatar_url: node.avatarUrl ?? undefined,
    html_url: node.url ?? undefined,
  };
}

export interface ViewerSocialGraphResult {
  following: GitHubSocialUser[];
  followers: GitHubSocialUser[];
}

export async function fetchViewerSocialGraph(
  client: GithubGraphqlClient,
  options: {
    followingFirst: number;
    followersFirst: number;
    graphqlOptions?: ExecuteGithubGraphqlOptions;
  },
): Promise<ViewerSocialGraphResult> {
  const data = await executeGithubGraphql(
    client,
    ViewerSocialGraphQuery,
    {
      followingFirst: options.followingFirst,
      followersFirst: options.followersFirst,
    },
    "GraphQL viewer social graph failed",
    options.graphqlOptions,
  );

  const following = (data.viewer.following?.nodes ?? [])
    .filter((node): node is SocialUserNode => node != null && Boolean(node.login))
    .map(mapSocialUser);
  const followers = (data.viewer.followers?.nodes ?? [])
    .filter((node): node is SocialUserNode => node != null && Boolean(node.login))
    .map(mapSocialUser);

  return { following, followers };
}
