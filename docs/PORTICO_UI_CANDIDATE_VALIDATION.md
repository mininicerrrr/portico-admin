# portico-ui 候选包临时集成验证（portico-admin）

> **跟踪依赖不变**：`package.json` 仍固定 [npm `portico-ui@0.1.0`](https://www.npmjs.com/package/portico-ui)。  
> 本文描述如何用 **portico-ui PR 产物** 做本地冒烟，**不**将 `file:` / tarball 写入 lockfile，**不**合并、部署或发 npm。  
> **非最终视觉签收**：设计侧审计仍进行中，本文只记录技术回归与诚实问题列表。

## 候选来源（当前）

| 项 | 值 |
| --- | --- |
| portico-ui PR | https://github.com/mininicerrrr/portico-ui/pull/2 |
| **Commit（当前验证）** | `ccd5058cf8277579dd38bc17bdb0915e6b6481fd` |
| 取代 | `cd9a003…`（已作废，勿再使用） |
| 包内版本字段 | `0.1.0`（与 npm 同号，**内容不同**） |

从 PR CI / 附件 tarball（例如 `portico-ui-0.1.0.tgz`）解压，**勿提交进本仓库**。

## 样式入口（以 package `exports` 为准）

```json
"exports": {
  ".": { "import": "./dist/portico-ui.es.js", ... },
  "./style.css": "./dist/style.css",
  "./theme.css": "./dist/style.css"
}
```

```ts
import 'portico-ui/style.css'
```

## 可重复临时安装步骤

```bash
# 0) 干净 npm 依赖
npm ci

# 1) 备份（可选）
cp -a node_modules/portico-ui /tmp/portico-ui-npm-backup

# 2) 解压 tarball 得到 package/ 后覆盖 node_modules
rm -rf node_modules/portico-ui
cp -a /path/to/extracted/package node_modules/portico-ui

# 3) 确认未误改 lockfile
git diff package-lock.json package.json   # 应无 file: 依赖

# 4) 验证
npm run typecheck && npm test && npm run build
# 另开终端: npm run dev -- --host 127.0.0.1 --port 5173
npm install --no-save playwright@1.49.0   # 不写入 lock 时可选用
node scripts/candidate-regression.mjs

# 5) 恢复正式 npm 包
npm ci
```

## v2 视觉验收点（库侧，非 admin 布局）

| 令牌 / 规则 | PR#2 候选 `ccd5058` | 备注 |
| --- | --- | --- |
| `--pt-color-primary` | `#3473ce` | |
| `--pt-radius-s` | `6px` | 控件圆角 |
| `--pt-border-width-control` | `1px` | |
| `--pt-bg-page`（亮色） | `#f6f8fb` | 中性蓝灰画布 |
| `--pt-lintel` | `0px` | 无门楣装饰 |
| 主按钮 `:before` lintel | 无 | |

**禁止**：在 admin 中通过 CSS 遮盖组件库缺陷。

## 字体

`@fontsource/noto-sans-sc@5.2.8`（SIL OFL）自托管 **400 / 500**；入口见 `src/main.ts`。

## 组件库本轮说明（与 admin 无关部分）

- **先前「暗色截图发白 / 窄屏表格异常」**：根因是 **VitePress 文档站 host CSS** 全局覆盖（已在 portico-ui 文档侧做 scoped 恢复）。**portico-admin 无 VitePress**，未引入文档 reset；admin 实测 `vitepress: false`。
- **斑马纹 / loading skeleton**：portico-ui 在库内修复 stripe 规则误伤 skeleton 的问题；admin 未改表格 CSS。

## 证据产物

- `candidate-token-evidence.json`（回归脚本输出，默认 `/opt/cursor/artifacts/`）
- 截图：`*-ccd5058.png` 或回归脚本默认命名

## 发现的问题（诚实记录）

### 1. `pt-theme` + 暗色（集成约定，非 CSS 补丁）

子树根 `admin-shell pt-theme` 需在暗色时设置 **`data-pt-theme="dark"`**（与 `useTheme` / `html.pt-dark` 同步）。已在 `AdminLayout` 使用库 API，**未**写组件覆盖样式。

### 2. Admin 主机碰撞

当前 **无** 与 VitePress / 文档站同类的全局样式注入；无需也不应在 admin 内复制 docs reset。

### 3. npm `0.1.0` vs 候选 tarball

| 来源 | `--pt-color-primary` | `--pt-radius-s` | `--pt-lintel` |
| --- | --- | --- | --- |
| npm `0.1.0` | `#3b7ddd` | `2px` | `3px` |
| PR#2 `ccd5058` | `#3473ce` | `6px` | `0px` |

**跟踪依赖仍为 npm**，直至新版本获批发布。

### 4. 设计签收状态

**设计师视觉审计：待完成**。本报告 **不构成** 最终视觉批准。

## 最近一次自动化结果（ccd5058）

- `typecheck` / `test` (7) / `build`：**通过**（候选覆盖 `node_modules` 后）
- `scripts/candidate-regression.mjs`：**通过**（路由、用户筛选/排序/分页/抽屉、表单校验、主题、窄屏导航）
- 亮色令牌：`#3473ce`、`6px`、`1px`、`#f6f8fb`、主按钮无 lintel
- 暗色 `--pt-bg-page`：`#111a27`；窄屏暗色 `admin-shell` 背景 `rgb(17,26,39)`；表头约 `rgb(31,45,64)`
- 字体栈首项：`"Noto Sans SC"`