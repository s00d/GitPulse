# Reddit — r/vuejs

**When:** D3 (same day as r/tauri or next day)

## Title

```
Vue 3 dashboard for a Tauri tray app — grouped repos, tabs, and search
```

## Body

```
I built [GitPulse](https://github.com/s00d/GitPulse) (GitHub tray companion) with **Vue 3 + Pinia + vue-i18n** for the dashboard.

**UI patterns**
- Issues / PRs: repo picker sidebar + category chips (needs review, my PRs, waiting)
- Stars: tab chips for Starred vs Your repositories
- Overview: stat cards + recent activity from refresh diff
- Shared search across tabs via provide/inject

The heavy lifting is GitHub API grouping in TS; tray menu is built separately with Tauri menu APIs.

MIT licensed, cross-platform. Demo gif on the README.

Feedback welcome: https://github.com/s00d/GitPulse/discussions/1
```
