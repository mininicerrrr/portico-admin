# GitHub Pages 部署提案（仅供审查，**未启用**）

## 状态

- **未**在 GitHub 启用 Pages
- **未**自动部署；工作流仅 `workflow_dispatch`（无 `pull_request` / `push` 触发）
- CI 主流程仍使用 registry **`portico-ui@0.1.0`**

## 路由方案

| 方案 | 说明 | 选择 |
| --- | --- | --- |
| `createWebHashHistory` | 免 404 回退，URL 带 `#` | 未采用（不利于分享深链） |
| **`createWebHistory` + `import.meta.env.BASE_URL`** | Vite `base: '/portico-admin/'`，路由与资源同源 | **采用**（与现有 `src/router/index.ts` 一致） |
| 全站 `index.html` 回退 | GitHub Pages 复制 `dist/index.html` → `404.html` | **构建后一步**（见 workflow） |

本地开发：`VITE_BASE_PATH` 省略时 `base: '/'`。Pages 构建：`VITE_BASE_PATH=/portico-admin/`。

## 验证

```bash
npm ci
VITE_BASE_PATH=/portico-admin/ npm run build
cp dist/index.html dist/404.html
npx playwright install chromium   # 浏览器二进制（playwright 已在 devDependencies）
npm run smoke:pages               # 断言 /portico-admin/ 资源前缀 + users/form-demo 直达与刷新
```

PR CI 含 `pages-preview-smoke` job（**无** Pages 部署权限）。

## 权衡

- **优点**：与生产路径一致；深链可刷新；无需改 UI。
- **成本**：依赖 `404.html` SPA 回退；Pages 项目路径必须为 `/portico-admin/`（或改 `VITE_BASE_PATH` 与仓库名一致）。
- **候选包**：Pages/CI **不能**装未发布 tarball；发布后只需 bump `package.json` 版本，不需改 base 逻辑。