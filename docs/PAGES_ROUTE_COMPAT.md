# GitHub Pages 深链兼容矩阵

## 根因

项目站 `https://<user>.github.io/portico-admin/` 上 **无服务端 history fallback**。仅 `cp index.html 404.html` 时：

- 根路径 `/portico-admin/` → **HTTP 200**
- `/portico-admin/users` 等 → **HTTP 404**（静态宿主要求真实文件 `users/index.html`）

`vite preview` 自带 SPA fallback，**会掩盖**上述 404，不可作为 Pages 验收依据。

## 方案（最小）

构建后 `write-pages-spa-routes.mjs` 将 `index.html` **复制**到：

- `users/index.html`
- `form-demo/index.html`
- `settings/index.html`

路由仍为 **history mode**（`createWebHistory(BASE_URL)`），URL **不变**。

## 兼容矩阵

| URL（相对站根） | 合并修复前 | 修复后（预期） |
| --- | --- | --- |
| `/portico-admin/` | 200，壳正常 | 200 |
| `/portico-admin/users` | **404**，壳异常 | **200**，用户列表 |
| `/portico-admin/form-demo` | **404** | **200** |
| `/portico-admin/settings` | **404** | **200** |
| `/portico-admin/users?qa=1` | 404 | **200**（query 不影响静态路径） |
| `/portico-admin/no-such-route` | 404 | **仍为 404**；`404.html` 可呈现壳，由客户端重定向首页 |
| `/#/users` 等 hash 书签 | 未支持 | **仍不支持**（未采用 hash 路由） |

## 回归

`npm run build:pages` + `npm run smoke:pages-static`：

- `static-dist-server.mjs`（**无** SPA fallback）
- 每条路由 **fetch GET → 断言 200**
- Playwright 直接打开、刷新、侧栏导航

产物：`pages-static-route-regression.json`（可选写入 `/opt/cursor/artifacts/`）。