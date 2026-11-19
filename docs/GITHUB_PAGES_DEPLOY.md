# GitHub Pages 正式部署工作流

## 触发与权限

| 工作流 | 触发 | 部署 |
| --- | --- | --- |
| `ci.yml` | `pull_request`、`push` → `main` | **否**（verify + pages-preview-smoke + actionlint） |
| `pages-deploy.yml` | `push` → `main`（**含 merge 入 main 的 push**）、`workflow_dispatch` | **尝试**（仅 `refs/heads/main`） |
| `pages-preview-proposal.yml` | 仅 `workflow_dispatch`（历史提案） | **否** |

- **无** `pull_request_target`；**`pages-deploy.yml` 不在 PR 上运行**。
- **`build-and-verify`**：全程仅 `contents: read`；产物用 `actions/upload-artifact`（非 Pages OIDC）。
- **`deploy`**：仅此 job 持有 `pages: write` + `id-token: write`（无 `contents`）；在此执行 `configure-pages`、`upload-pages-artifact`、`deploy-pages`。
- 官方 `upload-pages-artifact` 需 Pages/OIDC 写权限，故不在 build job 调用（见 [upload-pages-artifact](https://github.com/actions/upload-pages-artifact)）。
- `workflow_dispatch` 在非 `main` ref：job `if` 跳过。

## 同 revision 门禁

`deploy` **needs** `build-and-verify`（同一 workflow run、同一 checkout SHA）：

1. `npm ci` → `typecheck` → `test`
2. `VITE_BASE_PATH=/portico-admin/` build + `404.html`
3. `smoke:pages`
4. `upload-artifact`（dist）
5. `download-artifact` → `configure-pages` → `upload-pages-artifact` → `deploy-pages` → `page_url`

## merge 与部署行为

**合并本 PR 到 `main` 会产生 `push` 事件，`pages-deploy.yml` 将自动运行并尝试部署**（不等同于产品上线签收）。若 **Settings → Pages** 源未设为 GitHub Actions，`deploy` 可能失败直至人工配置。

本补丁 PR 阶段：**未** merge、**未** `workflow_dispatch`、**未** 改 Pages 设置 → **无真实对外部署**；授权方需在 merge 后自行验证 `page_url`。

## 路径

- Vite `base`: `/portico-admin/`（`VITE_BASE_PATH`）
- Vue Router：`createWebHistory(import.meta.env.BASE_URL)` + SPA `404.html` 回退

依赖仍为 registry **`portico-ui@0.1.2`**（无业务行为变更）。