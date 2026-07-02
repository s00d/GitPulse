---
title: "I Built a GitHub Menu Bar App with Tauri 2"
published: false
description: "GitPulse — tray-first GitHub companion for issues, PRs, and notifications. Architecture, UX choices, and what I learned."
tags: tauri, vue, rust, github, opensource
cover_image: https://github.com/s00d/GitPulse/raw/main/docs/assets/intro.gif
canonical_url: https://github.com/s00d/GitPulse
---

I check GitHub more often than I'd like to admit — assigned issues, PRs waiting for review, unread notifications. The web app is great for deep work, but terrible for a ten-second status check. Mobile helps, but I wanted something **always visible on desktop** without another browser tab.

So I built [GitPulse](https://github.com/s00d/GitPulse): an open-source tray app for macOS, Windows, and Linux.

![GitPulse demo](https://github.com/s00d/GitPulse/raw/main/docs/assets/intro.gif)

## Why not just use email notifications?

Email and GitHub Mobile notify you about *events*, not *state*. I wanted:

- Counts grouped by **repository**
- PR categories: needs my review, my open PRs, waiting on author
- One glance from the **system tray**, then back to my editor

That maps better to a dedicated desktop client than to an inbox.

## Stack

| Layer | Choice |
|-------|--------|
| Shell | **Tauri 2** (Rust) |
| UI | **Vue 3** + Pinia + vue-i18n |
| GitHub | REST + Search API from the webview |
| Auth | Device code OAuth, `gh` CLI import, or PAT in keyring |
| Updates | Tauri updater + GitHub Actions signed releases |

Tauri was the obvious fit: small binary, real tray integration, and I already wanted Rust on the backend for future native work.

## Tray-first architecture

The tray menu is not an afterthought — it's the primary UI.

On each refresh, the app:

1. Fetches issues, PRs, stars, watching, notifications
2. Groups them by repo (and PR category inside each repo)
3. Rebuilds the native menu with **badge icons** (custom PNGs generated at build time)
4. Diffs the previous snapshot to populate **recent activity** and trigger desktop notifications

Menu items use `IconMenuItem` with pre-rendered glyphs so counts stay readable on macOS (native text badges are tiny).

Opening the full window is optional — Overview, Feed, Issues, PRs, Stars, Watching, Settings.

## UX decisions that mattered

**Repo picker + chips.** Issues and PRs use a two-level layout: pick a repo on the left, optionally pick a PR category (review / mine / waiting) on chips. Same mental model as GitHub, less scrolling.

**Stars split.** Two tray entries: repos you've starred, and *your* repos sorted by star count — different questions, different sorts.

**Repo visibility.** Hide side projects from the tray and notifications without signing out. Settings store a per-repo map applied on every refresh.

**Refresh diff.** Persist item snapshots between sessions so bootstrap refresh after restart still detects what changed overnight — not just polling while the app is open.

## Hard parts

**Tray icon badges.** `node-canvas` silently ignored font sizes until I switched to explicit `Arial` metrics. Lesson: always QA generated PNGs at 1:1 tray size.

**Rate limits.** Search API for issues/PRs; list endpoints for stars/watching. Polling interval is user-configurable; manual refresh shows last updated time.

**OAuth for device sign-in.** OAuth Client ID is bundled at build time; users can skip it with `gh` or a PAT.

**Cross-platform tray.** Linux tray behavior varies by DE; Windows and macOS are smoother. Feedback welcome from non-macOS users.

## Try it

- **Repo + gif:** https://github.com/s00d/GitPulse  
- **Download:** https://github.com/s00d/GitPulse/releases/latest  
- **Feedback:** https://github.com/s00d/GitPulse/discussions/1  

MIT licensed. If you build tray apps with Tauri — or live in GitHub all day — I'd love to hear what would make this your daily driver.

What's missing for your workflow?
