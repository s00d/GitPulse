import type { z } from "zod";
import { z as zod } from "zod";

export const notificationSchema = zod.object({
  id: zod.string(),
  unread: zod.boolean(),
  reason: zod.string(),
  updated_at: zod.string(),
  subject: zod.object({
    title: zod.string(),
    type: zod.string(),
    url: zod.string().nullable(),
  }),
  repository: zod.object({
    full_name: zod.string(),
    html_url: zod.string(),
  }),
});

export const publicEventSchema = zod.object({
  id: zod.string(),
  type: zod.string(),
  actor: zod
    .object({
      id: zod.number().optional(),
      login: zod.string().optional(),
      avatar_url: zod.string().optional(),
      url: zod.string().optional(),
    })
    .optional(),
  repo: zod
    .object({
      id: zod.number().optional(),
      name: zod.string().optional(),
      url: zod.string().optional(),
    })
    .optional(),
  payload: zod.record(zod.string(), zod.unknown()).nullable().optional(),
  public: zod.boolean().optional(),
  created_at: zod.string(),
});

/** Inferred REST API shapes (runtime-validated via Zod in `restFetch`). */
export type GitHubNotificationApi = z.infer<typeof notificationSchema>;
export type GitHubPublicEventApi = z.infer<typeof publicEventSchema>;
