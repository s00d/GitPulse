# Screenshots for promotion

Use these captures in Reddit, Product Hunt, and social posts. The animated demo lives at [intro.gif](../intro.gif).

## Required shots

| File | What to capture | Used for |
|------|-----------------|----------|
| `tray-menu.png` | Tray icon + open menu (issues, PRs, stars, refresh with timestamp) | Reddit r/macapps, Product Hunt |
| `dashboard-overview.png` | Overview tab with stat cards + recent activity | HN, Dev.to, README |
| `dashboard-prs.png` | Pull Requests tab with repo picker + category chips | Dev.to, r/vuejs |

## How to capture

1. Run a signed-in build: `pnpm tauri dev` or install from [Releases](https://github.com/s00d/GitPulse/releases).
2. macOS: `Cmd+Shift+4` then spacebar on window, or use CleanShot/Xnapper.
3. Prefer light or dark mode consistently (dark matches README gif).
4. Crop to content; avoid personal tokens or private repo names if posting publicly.
5. Export PNG, max width ~1600px.

## Optional

- `stars-tabs.png` — Stars tab with Starred / Your repositories chips
- `settings.png` — Settings with repo visibility (no token visible)

After adding files here, reference them in [README.md](../../README.md) and [promotion posts](./README.md).
