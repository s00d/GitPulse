import { afterEach, describe, expect, it, vi } from "vitest";
import { useHttpClient } from "@/composables/useHttpClient";
import type { ApiDebugEntry } from "@/github/apiDebug";

vi.mock("@tauri-apps/plugin-http", () => ({
  fetch: vi.fn(),
}));

import { fetch } from "@tauri-apps/plugin-http";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: { "content-type": "application/json" },
  });
}

describe("useHttpClient debugRecorder", () => {
  afterEach(() => {
    vi.mocked(fetch).mockReset();
  });

  it("does not call recorder when debugRecorder is omitted", async () => {
    const recorder = vi.fn();
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: true }));

    const http = useHttpClient({ baseUrl: "https://api.github.com" });
    await http.get("/user");

    expect(recorder).not.toHaveBeenCalled();
  });

  it("records successful requests", async () => {
    const recorded: ApiDebugEntry[] = [];
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ login: "dev" }, 200),
    );

    const http = useHttpClient({
      baseUrl: "https://api.github.com",
      debugRecorder: (entry) => recorded.push(entry),
    });

    await http.get("/user");

    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.method).toBe("GET");
    expect(recorded[0]?.url).toBe("https://api.github.com/user");
    expect(recorded[0]?.status).toBe(200);
    expect(recorded[0]?.responseBody).toEqual({ login: "dev" });
    expect(recorded[0]?.requestHeaders.Authorization).toBeUndefined();
  });

  it("records failed http responses", async () => {
    const recorded: ApiDebugEntry[] = [];
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ message: "Not Found" }, 404),
    );

    const http = useHttpClient({
      baseUrl: "https://api.github.com",
      debugRecorder: (entry) => recorded.push(entry),
    });

    await expect(http.get("/missing")).rejects.toBeTruthy();

    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.status).toBe(404);
    expect(recorded[0]?.error).toContain("404");
    expect(recorded[0]?.responseBody).toEqual({ message: "Not Found" });
  });

  it("redacts bearer token in recorded headers", async () => {
    const recorded: ApiDebugEntry[] = [];
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: true }));

    const http = useHttpClient({
      baseUrl: "https://api.github.com",
      getAuthToken: () => "secret-token",
      debugRecorder: (entry) => recorded.push(entry),
    });

    await http.get("/user");

    expect(recorded[0]?.requestHeaders.Authorization).toBe("Bearer ***");
  });
});
