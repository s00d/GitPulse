# Tauri + Vue + TypeScript

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

## Splash screen (desktop)

The desktop splash webview loads `splashscreen.html` via `WebviewUrl::App`. Vite copies static assets from `public/` into `dist/` at build time, so **`public/splashscreen.html` is required** — a file in the repo root is not bundled and will 404 in production.

Verification:

```bash
pnpm build && test -f dist/splashscreen.html
```

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
