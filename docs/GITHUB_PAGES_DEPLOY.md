# GitHub Pages 正式部署工作流

## 触发与权限

| 工作流 | 触发 | 部署 |
| --- | --- | --- |
| `ci.yml` | `pull_request`、`push` → `main` | **否**（verify + pages-static-host-smoke + actionlint） |
| `pages-deploy.yml` | `push` → `main`（**含 merge 入 main 的 push**）、`workflow_dispatch` | **尝试**（仅 `refs/heads/main`） |
| `pages-preview-proposal.yml` | 仅 `workflow_dispatch`（历史提案） | **否** |

- **无** `pull_request_target`；**`pages-deploy.yml` 不在 PR 上运行**。
- **`build-and-verify`**：全程仅 `contents: read`；`npm ci`/test/build/smoke 阶段不授 `pages:write`/`id-token:write`；staging 用 `actions/upload-artifact`。
- **`deploy`**：仅此 job 持有 `pages: write` + `id-token: write`（无 `contents`、无 `actions:write`）。
- **权限勘误**：[`upload-pages-artifact@v3`](https://github.com/actions/upload-pages-artifact) 为 tar + `upload-artifact` 的 composite，**本体不**要求 `pages:write`/OIDC；**`deploy-pages`** 才硬性需要 Pages/OIDC。为最小权限，elevated token 仅覆盖 deploy job（含 `configure-pages`、`upload-pages-artifact`、`deploy-pages`）。
- **Concurrency**：workflow 级 `cancel-in-progress: false`，避免新 run 取消在途 **deploy**（job 级 `false` 无法抵消 workflow 级 `true`）。
- `workflow_dispatch` 在非 `main` ref：job `if` 跳过。

## 同 revision 门禁

### `ci.yml`（`pages-static-host-smoke` job，不部署）

1. `npm ci`
2. `npm run build:pages`（`VITE_BASE_PATH=/portico-admin/` build + `write-pages-spa-routes` + `404.html`，见 [PAGES_ROUTE_COMPAT.md](./PAGES_ROUTE_COMPAT.md)）
3. `npm run smoke:pages-static`（无 SPA fallback 静态宿主；断言 **first GET** 状态，非 `vite preview`）

### `pages-deploy.yml` — `build-and-verify` 后 `deploy` needs 前者

**build-and-verify**（同 checkout SHA）：

1. `npm ci` → `typecheck` → `test`
2. `npm run build:pages`
3. `npm run smoke:pages-static`
4. `actions/upload-artifact`（dist）

**deploy**（仅 `pages:write` + `id-token:write`）：

1. `actions/download-artifact`
2. `configure-pages` → `upload-pages-artifact` → `deploy-pages` → `page_url`

## merge 与部署行为

**合并本 PR 到 `main` 会产生 `push` 事件，`pages-deploy.yml` 将自动运行并尝试部署**（不等同于产品上线签收）。若 **Settings → Pages** 源未设为 GitHub Actions，`deploy` 可能失败直至人工配置。

本补丁 PR 阶段：**未** merge、**未** `workflow_dispatch`、**未** 改 Pages 设置 → **无真实对外部署**；授权方需在 merge 后自行验证 `page_url`。

## 路径

- Vite `base`: `/portico-admin/`（`VITE_BASE_PATH`）
- Vue Router：`createWebHistory(import.meta.env.BASE_URL)` + SPA `404.html` 回退

依赖仍为 registry **`portico-ui@0.1.3`**（无业务行为变更）。