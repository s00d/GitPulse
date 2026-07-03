import type { z } from "zod";
import type { useHttpClient } from "@/composables/useHttpClient";

type HttpClient = Pick<
  ReturnType<typeof useHttpClient>,
  "get" | "post" | "patch" | "put" | "del"
>;

type QueryValue = string | number | boolean | null | undefined;

export async function fetchRestArray<TSchema extends z.ZodTypeAny>(
  http: HttpClient,
  path: string,
  itemSchema: TSchema,
  query?: Record<string, QueryValue>,
): Promise<Array<z.infer<TSchema>>> {
  const data = await http.get<unknown[]>(path, query);
  return (data ?? []).map((item) => itemSchema.parse(item));
}
