import { z } from "zod";

const userSchema = z.object({
  login: z.string(),
  avatar_url: z.string().optional(),
  html_url: z.string().optional(),
});

export const viewerSchema = z.object({
  login: z.string(),
  avatar_url: z.string().optional(),
});

export const issueSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  state: z.string(),
  html_url: z.string(),
  repository_url: z.string(),
  user: userSchema,
  labels: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        color: z.string(),
      }),
    )
    .default([]),
  assignees: z.array(userSchema).nullable().optional(),
  draft: z.boolean().nullable().optional(),
  pull_request: z
    .object({
      html_url: z.string(),
      merged_at: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  created_at: z.string().optional(),
  updated_at: z.string(),
  comments: z.number().default(0),
});

export const searchResponseSchema = z.object({
  total_count: z.number(),
  items: z.array(issueSchema),
});

export const starredRepoSchema = z.object({
  id: z.number(),
  full_name: z.string(),
  html_url: z.string(),
  description: z.string().nullable().optional(),
  stargazers_count: z.number().default(0),
  updated_at: z.string(),
});

export const watchedRepoSchema = starredRepoSchema;

export const notificationSchema = z.object({
  id: z.string(),
  unread: z.boolean(),
  reason: z.string(),
  updated_at: z.string(),
  subject: z.object({
    title: z.string(),
    type: z.string(),
    url: z.string().nullable(),
  }),
  repository: z.object({
    full_name: z.string(),
    html_url: z.string(),
  }),
});

export const socialUserSchema = z.object({
  id: z.number(),
  login: z.string(),
  avatar_url: z.string().optional(),
  html_url: z.string().optional(),
});

export const publicEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  actor: z
    .object({
      id: z.number().optional(),
      login: z.string().optional(),
      avatar_url: z.string().optional(),
      url: z.string().optional(),
    })
    .optional(),
  repo: z
    .object({
      id: z.number().optional(),
      name: z.string().optional(),
      url: z.string().optional(),
    })
    .optional(),
  payload: z.record(z.string(), z.unknown()).nullable().optional(),
  public: z.boolean().optional(),
  created_at: z.string(),
});
