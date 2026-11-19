# GitHub Pages 正式部署工作流（代码就绪，PR 不触发部署）

## 触发与权限

| 工作流 | 触发 | 部署 |
| --- | --- | --- |
| `ci.yml` | `pull_request`、`push` → `main` | **否**（仅 verify + pages-preview-smoke） |
| `pages-deploy.yml` | `push` → `main`、`workflow_dispatch` | **是**（仅当 `ref == refs/heads/main`） |
| `pages-preview-proposal.yml` | 仅 `workflow_dispatch`（历史提案） | **否** |

- **无** `pull_request_target`；PR 不在不可信 head 上授予 `pages:write`。
- `pages-deploy.yml`：`build-and-verify` 仅 `contents: read`；`deploy` 作业 `pages: write` + `id-token: write`。
- `workflow_dispatch` 在非 `main` ref 上：各 job `if: github.ref == 'refs/heads/main'` → **跳过，不部署**。

## 同 revision 门禁

`deploy` **needs** `build-and-verify`（同一 workflow run、同一 checkout SHA）：

1. `npm ci` → `typecheck` → `test`
2. `VITE_BASE_PATH=/portico-admin/` build + `404.html`
3. `smoke:pages`（与 CI `pages-preview-smoke` 同脚本）
4. `configure-pages` → `upload-pages-artifact`
5. `deploy-pages` → `environment.url` = `steps.deployment.outputs.page_url`

## 仓库侧前提（人工，本 PR 不代为点击）

- GitHub **Settings → Pages**：Source = **GitHub Actions**（启用后 `main` 上首次成功 deploy 才会产生 `page_url`）。
- 本 Agent **未**执行 `workflow_dispatch`，**未**在 PR 分支产生真实 deployment。

## 路径

- Vite `base`: `/portico-admin/`（`VITE_BASE_PATH`）
- Vue Router：`createWebHistory(import.meta.env.BASE_URL)` + SPA `404.html` 回退

依赖仍为 registry **`portico-ui@0.1.2`**（无业务行为变更）。