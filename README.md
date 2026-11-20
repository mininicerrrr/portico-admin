# Portico Admin

A polished **demo admin shell** for [portico-ui](https://www.npmjs.com/package/portico-ui) `0.1.3` (Vue 3 + TypeScript + Vite + vue-router). It is MIT-licensed application code only — **not** an npm package.

[English](./README.md) | [简体中文](./README.zh-CN.md)

## Access

- **Live demo:** [https://mininicerrrr.github.io/portico-admin/](https://mininicerrrr.github.io/portico-admin/)
- **Component docs:** [https://mininicerrrr.github.io/portico-ui/](https://mininicerrrr.github.io/portico-ui/)
- **npm package:** [portico-ui](https://www.npmjs.com/package/portico-ui)

## Features

- Chinese-first UI copy, responsive **sidebar / header / content**, breadcrumbs, and vue-router navigation
- **Dashboard** with clearly labeled demo metrics
- **Users** list: search, filter, custom sort, pagination, and edit **drawer** (in-memory only)
- **Form demo** with validation (`PtForm`), select, switch, and date picker
- **Settings** with light/dark theme (persisted in `localStorage`)
- Consumes official `portico-ui` CSS via `import 'portico-ui/style.css'` — no fork/patch of the library

## Requirements

- Node.js 20+ (CI uses 22)
- npm

## Scripts

| Command | Description |
| --- | --- |
| `npm install` | Install dependencies (pins `portico-ui@0.1.3`) |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `vue-tsc` type check |
| `npm test` | Vitest unit tests |
| `npm run preview` | Preview production build |

## Quick start

```bash
npm install
npm run dev
```

Open the URL printed by Vite (default `http://localhost:5173`).

## Project layout

```
src/
  layouts/AdminLayout.vue   # Shell: nav, header, breadcrumbs, theme toggle
  views/                    # Dashboard, Users, Form demo, Settings
  composables/useTheme.ts   # Light/dark + localStorage
  data/demoUsers.ts         # Labeled demo seed data (ids are strings)
  utils/userFilters.ts      # Search/filter/sort helpers (tested)
```

## Theming

Dark mode follows portico-ui: `html.pt-dark` and, on the app shell `pt-theme` root, `[data-pt-theme="dark"]` (see layout). Preference key: `portico-admin-theme`.

Typography uses self-hosted **Noto Sans SC** via `@fontsource/noto-sans-sc` (OFL).

## Candidate package validation (portico-ui PRs)

Before a new portico-ui release, use a tarball **without** changing tracked dependencies: [docs/PORTICO_UI_CANDIDATE_VALIDATION.md](./docs/PORTICO_UI_CANDIDATE_VALIDATION.md).

## Data & auth

All CRUD interactions are **in-memory or localStorage demo only**. There is no backend, login, or production auth.

## License

MIT — see [LICENSE](./LICENSE).

## Related

- UI package: `portico-ui@0.1.3` on npm (do not modify that repo from this app).