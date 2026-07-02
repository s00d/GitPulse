# Reddit — r/tauri

**When:** D3 (1–2 days after Show HN)

## Title

```
Built a GitHub tray app with Tauri 2 — tray icons, updater, cross-platform releases
```

## Body

```
Sharing a project I shipped with **Tauri 2**: [GitPulse](https://github.com/s00d/GitPulse) — tray/menu bar companion for GitHub (issues, PRs, stars, notifications).

**Tauri bits I used**
- System tray with dynamic menu rebuild + badge counts on menu icons
- `tray://` custom events for open URL / refresh actions
- Updater plugin with signed releases (GitHub Actions)
- Opener, notification, store plugins

Frontend is Vue 3 + Pinia; GitHub API from the webview with token from Rust keyring.

Demo gif in the README. Would appreciate feedback from other Tauri tray app builders — especially Linux tray quirks.

Releases: https://github.com/s00d/GitPulse/releases/latest
```

## Optional comment

Mention `src/tray/menuBuilders.ts` and `scripts/generate-tray-icons.mjs` if someone asks about tray PNG badges.
