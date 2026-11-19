# portico-ui 候选包临时集成验证（portico-admin）

> **跟踪依赖不变**：`package.json` 仍固定 [npm `portico-ui@0.1.0`](https://www.npmjs.com/package/portico-ui)。  
> 本文描述如何用 **portico-ui PR 产物** 做本地冒烟，**不**将 `file:` / tarball 写入 lockfile，**不**合并、部署或发 npm。  
> **非最终视觉签收**：设计侧审计仍进行中，本文只记录技术回归与诚实问题列表。

## 候选来源（当前）

| 项 | 值 |
| --- | --- |
| portico-ui PR | https://github.com/mininicerrrr/portico-ui/pull/2 |
| **候选短 ref** | `f84d4bd` |
| **验证用 tarball SHA256** | `cb01d7eccf4ecfe438c0b89bb6c5ac723a2071f309b503d6d7db0974488ad7fa`（附件 `portico-ui-0.1.0_a58a.tgz`，本地 `sha256sum` 已核对一致） |
| **implementationSourceCommitSha** | `f84d4bd76e76daa7ead98d4b7a5fe0b442fecc78`（实现本体） |
| **portico-ui 分支 HEAD（仅 capture/manifest 脚本）** | `fb0916777b40becdca1f39e4d12b16559e57de01` |
| 取代 | `b1901ae…`、`cd9a003…` 及更早候选（已作废） |
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
node scripts/capture-ui-regression.mjs   # 视口截图 + 表格重叠检测（非终审）

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
| PR#2 `b1901ae` | `#3473ce` | `6px` | `0px` |

**跟踪依赖仍为 npm**，直至新版本获批发布。

### 4. 设计签收状态

**设计师 targeted 复审：可见阻断项已清，供 USER 复审**（**尚无用户最终批准** / `finalVerificationComplete: false`；**非** merge / release / npm）。

**`final verification complete` = 否** — 令牌/构建通过不等于视觉验收。

### 5. 库侧待定（仅记录，admin 不改库源码）

|  topic | 说明 |
| --- | --- |
| `PtTable` 溢出（`4bcf938`） | 库侧：默认单元格溢出 + `colgroup`、`showOverflowTooltip` 列选项、导出 **`PtTableEllipsisCell`**。Admin：**固定列宽** + 文本列 **admin `TableEllipsisCell` 插槽**（自定义槽内容自备裁切）；标签/按钮槽仍由 admin 负责。跟踪 npm 类型未更新前不强制改用库导出。 |
| disabled / loading 样式 | 组件工作流处理中；admin 不重复修改。 |

## 窄屏截图要求（避免假阳性）

`capture-ui-regression.mjs` 在 **narrow closed** 截图前必须断言：`admin-sidebar-backdrop` 不存在、`.admin-sidebar.is-open` 为假、侧栏不覆盖 `admin-main`（通过 **菜单** 按钮关闭，必要时重试）。证据 JSON 记录 `viewport` + `deviceScaleFactor` 与 `mobileNav` 状态。

## 最近一次自动化结果（f84d4bd + tarball SHA256，非终审）

> 临时覆盖 `node_modules/portico-ui` 后请 **`rm -rf node_modules/.vite`** 并 **`vite --force`** 重启 dev，否则可能仍预构建旧 npm 包（表格 `showOverflowTooltip` 路径不生效）。

**Admin 证据提交**：`398ada6dfc62e8e6af82168fbf227ea8e2b86f70`（回归运行于其父 `20b39bd…`；`capture-ui-regression-f84d4bd.json` 内 `adminGitSha` 为当时 HEAD）

**闸门**：`typecheck` / `test` (7) / `build` — 通过（tarball 已装 `node_modules`，SHA256 与上表一致）

**`candidate-regression.mjs`**：通过（路由、筛选/排序/分页/抽屉、表单校验 3 条、主题、窄屏导航）；令牌亮色 `#3473ce` / `6px` / `#f6f8fb`，暗色 `#111a27`；字体栈首项 `"Noto Sans SC"`

**`capture-ui-regression.mjs`**：截图见 `/opt/cursor/artifacts/*-f84d4bd.png` 与 `candidate-ui-regression-f84d4bd.json`；邮箱列 `showOverflowTooltip`：**hover 时 Teleport + `position:fixed` 且在视口内**；窄屏 nav open/closed 断言通过（open `37782` B vs closed `76916` B，非同图）

**自动化仍记录的诚实问题（非设计签收结论）**：
- **Primary 按下态**：`mousedown` 采样下文案/背景近似对比 **~2.24**（脚本阈值 2.5，`readable: false`）— 与设计师「可见阻断已清」并行，供 USER 看截图与 JSON
- **Tooltip 离开/聚焦**：`closesOnLeave: false`（DOM 仍留 panel 节点）；`afterFocus.inViewport: false` — 需人工对照截图，未见表格裁切回归