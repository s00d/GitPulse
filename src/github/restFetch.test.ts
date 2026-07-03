import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { useHttpClient } from "@/composables/useHttpClient";
import { fetchRestArray } from "@/github/restFetch";

vi.mock("@tauri-apps/plugin-http", () => ({
  fetch: vi.fn(),
}));

import { fetch } from "@tauri-apps/plugin-http";

const itemSchema = z.object({ id: z.number(), name: z.string() });

describe("fetchRestArray", () => {
  it("parses each item with the provided schema", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify([{ id: 1, name: "alpha" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const http = useHttpClient({ baseUrl: "https://api.github.com" });
    const items = await fetchRestArray(http, "/items", itemSchema);

    expect(items).toEqual([{ id: 1, name: "alpha" }]);
  });
});
