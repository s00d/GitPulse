import type { HttpMethod } from "@/composables/useHttpClient";

export const API_DEBUG_MAX_BODY_BYTES = 32_768;

export interface ApiDebugEntry {
  id: string;
  startedAt: string;
  durationMs: number;
  method: HttpMethod;
  url: string;
  requestHeaders: Record<string, string>;
  requestBody?: unknown;
  status?: number;
  statusText?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
  responseTruncated?: boolean;
  error?: string;
}

const SENSITIVE_HEADER_KEYS = new Set(["authorization", "x-github-otp"]);

export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const redacted: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADER_KEYS.has(key.toLowerCase())) {
      redacted[key] = key.toLowerCase() === "authorization" ? "Bearer ***" : "***";
      continue;
    }
    redacted[key] = value;
  }
  return redacted;
}

export function pickResponseHeaders(headers: Headers): Record<string, string> {
  const picked: Record<string, string> = {};
  for (const key of ["content-type", "x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset"]) {
    const value = headers.get(key);
    if (value) picked[key] = value;
  }
  return picked;
}

export function truncateForDebug(
  value: unknown,
  maxBytes = API_DEBUG_MAX_BODY_BYTES,
): { value: unknown; truncated: boolean } {
  if (value === undefined) {
    return { value, truncated: false };
  }

  let serialized: string;
  try {
    serialized = typeof value === "string" ? value : JSON.stringify(value);
  } catch {
    return { value: "[unserializable]", truncated: false };
  }

  if (serialized.length <= maxBytes) {
    return { value, truncated: false };
  }

  return {
    value: `${serialized.slice(0, maxBytes)}…`,
    truncated: true,
  };
}

export function formatDebugJson(value: unknown): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function createApiDebugEntryId(): string {
  return `dbg:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

export function formatApiDebugPath(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}
