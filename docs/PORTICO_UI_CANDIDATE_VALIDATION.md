# portico-ui 候选包临时集成验证（portico-admin）

> **跟踪依赖不变**：`package.json` 仍固定 [npm `portico-ui@0.1.0`](https://www.npmjs.com/package/portico-ui)。  
> 本文描述如何用 **portico-ui PR 产物** 做本地冒烟，**不**将 `file:` / tarball 写入 lockfile，**不**合并、部署或发 npm。

## 候选来源

| 项 | 值 |
| --- | --- |
| portico-ui PR | https://github.com/mininicerrrr/portico-ui/pull/2 |
| Commit | `cd9a003f5a6cad0c58ede57b2830d660258e628a` |
| 包内版本字段 | `0.1.0`（与 npm 同号，**内容不同**） |

从 PR CI 下载 tarball（或本地 `npm pack`），**勿提交进本仓库**。

## 样式入口（以 package `exports` 为准）

候选包 `package.json`：

```json
"exports": {
  ".": { "import": "./dist/portico-ui.es.js", ... },
  "./style.css": "./dist/style.css",
  "./theme.css": "./dist/style.css"
}
```

admin 应用入口（`src/main.ts`）应继续使用：

```ts
import 'portico-ui/style.css'
```

## 可重复临时安装步骤

在 **portico-admin** 根目录，且已 `npm ci`（npm 版 `0.1.0`）：

```bash
# 1) 备份（可选）
cp -a node_modules/portico-ui /tmp/portico-ui-npm-backup

# 2) 解压候选 tarball 得到 package/ 目录后，覆盖 node_modules（不改 package.json / lockfile）
rm -rf node_modules/portico-ui
cp -a /path/to/extracted/package node_modules/portico-ui

# 3) 确认未误改 lockfile
git diff package-lock.json package.json   # 应无 file: / 路径依赖

# 4) 验证
npm run typecheck
npm test
npm run build
node scripts/candidate-regression.mjs     # 需 dev server + Playwright（见脚本头注释）

# 5) 恢复正式 npm 包
npm ci
```

也可用一次性覆盖（仍不写入 lockfile）：

```bash
npm install /absolute/path/portico-ui-0.1.0.tgz --no-save
# 验证结束后务必 npm ci 还原
```

## v2 视觉验收点（库侧，非 admin 布局）

候选 `dist/style.css` 中预期（与 v1 npm 对比）：

| 令牌 / 规则 | v2 候选（cd9a003） | 备注 |
| --- | --- | --- |
| `--pt-color-primary` | `#3473ce` | |
| `--pt-radius-s` | `6px` | 控件圆角 |
| `--pt-border-width-control` | `1px` | |
| `--pt-bg-page`（亮色） | `#f6f8fb` | 中性蓝灰画布 |
| `--pt-lintel` | `0px` | 无门楣装饰 |
| 主按钮 `:before` lintel | 无 | |

**禁止**：在 admin 中通过 CSS 遮盖组件库缺陷；问题应回报 portico-ui 工作流。

## 字体

Admin 通过 [`@fontsource/noto-sans-sc`](https://www.npmjs.com/package/@fontsource/noto-sans-sc)（SIL OFL）自托管 **400 / 500**，与库的 `--pt-font-family: "Noto Sans SC", …` 对齐。不依赖 Google Fonts CDN。

## 最近一次验证记录

见当前 PR 讨论区 / Agent 报告附带的：

- `candidate-token-evidence.json`
- 截图：`candidate-users-*.png`、`candidate-form-*.png`

验证完成后组件库仍可能修复暗色表格、文档 host 等问题；**正式发版前需用新 tarball 重跑本文流程**。

## 发现的问题（诚实记录）

### 1. `pt-theme` 与 `html.pt-dark` 的变量作用域（集成 + 库文档）

候选包在 `:root, .pt-theme { … }` 中为 **亮色** 令牌赋值。若在子树根（如 `AdminLayout` 的 `admin-shell pt-theme`）上使用 `.pt-theme`，该元素自身的 `--pt-*` 会覆盖从 `html.pt-dark` 继承的暗色值，导致 **页面外壳画布仍为亮色**（实测 `admin-shell` 背景约 `#f6f8fb`，而 `body` 可为 `#111a27`）。

**Admin 侧处理（非 CSS 覆盖）**：在应用根壳层使用库支持的 `[data-pt-theme="dark"]`（见 portico-ui README），与 `useTheme` 同步，例如 `data-pt-theme="dark"`。

**库侧建议**：文档中明确「在子树使用 `PtConfigProvider` / `.pt-theme` 时，暗色须在同一节点设置 `data-pt-theme="dark"`」，或让 `html.pt-dark` 也能覆盖 `.pt-theme` 子树的令牌。

### 2. 暗色表格（待组件库继续修复）

人工观察：暗色下表头与斑马纹对比度在部分行仍偏弱（portico-ui PR#2 工作流中已提及）。本次自动化 **未** 在 admin 中加表格样式补丁。

### 3. npm 正式发布 `0.1.0` 与候选 tarball

| 来源 | `--pt-color-primary` | `--pt-radius-s` | `--pt-lintel` |
| --- | --- | --- | --- |
| npm `0.1.0` | `#3b7ddd` | `2px` | `3px` |
| PR#2 `cd9a003` | `#3473ce` | `6px` | `0px` |

跟踪依赖仍为 npm，直至新版本获批发布。

## 最近一次自动化结果（cd9a003）

- `typecheck` / `test` / `build`：**通过**（候选覆盖 `node_modules` 后）
- 回归脚本：`node scripts/candidate-regression.mjs`
- 令牌抽样（亮色）：`#3473ce`、`6px`、`1px`、`#f6f8fb`、主按钮无 lintel `::before`
- 字体：`@fontsource/noto-sans-sc` 400/500，computed 栈首项为 `"Noto Sans SC"`