import type { Endpoints } from "@octokit/types";

type MarkNotificationReadEndpoint = Endpoints["PATCH /notifications/threads/{thread_id}"];

export type MarkNotificationReadParams = MarkNotificationReadEndpoint["parameters"];

export type MarkNotificationReadBody = Omit<MarkNotificationReadParams, "thread_id">;
