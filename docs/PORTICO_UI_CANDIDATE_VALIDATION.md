# portico-ui 候选包临时集成验证（portico-admin）

> **跟踪依赖不变**：`package.json` 仍固定 [npm `portico-ui@0.1.0`](https://www.npmjs.com/package/portico-ui)。  
> **PREPARED 候选 `0.1.1` 未公开发布**；不得 merge / deploy / 发 npm / 启用 Pages。

## 候选来源（当前 P2 / 最终差量）

| 项 | 值 |
| --- | --- |
| **implementationSourceCommitSha** | `61bedc17142d1afe11a5b7345b34bb5b5c05e2b1` |
| **证据脚本 HEAD（portico-ui repo）** | `a614c7b63ca6f778d7fc77d6e940b459b1cf5dd1` |
| **tarball SHA256** | `3fd6e3a37724431bc2cf609fbbdd13380e81275c629b162f4c182600837648cd`（`portico-ui-0.1.1_e702.tgz`） |
| **取代** | `b72f034` / `f84d4bd` / `0.1.0` tarball 等更早候选 |

## 运行要点

1. 解压 tarball → 覆盖 `node_modules/portico-ui`（**勿**改 lockfile）
2. `rm -rf node_modules/.vite` 且 `vite --force` 重启 dev
3. `npm run typecheck && npm test && npm run build`
4. `ADMIN_GIT_SHA=$(git rev-parse HEAD) node scripts/candidate-regression.mjs`
5. 全矩阵：`ADMIN_GIT_SHA=$(git rev-parse HEAD) node scripts/capture-ui-regression.mjs`
6. **差量**（不重拍已通过矩阵）：`CAPTURE_DELTA=1 ADMIN_GIT_SHA=$(git rev-parse HEAD) node scripts/capture-ui-regression.mjs`

证据 JSON 含：`installedNodeModules.fileSha256` + `browserLoadedPorticoUi`（**tarball 哈希 alone 不能证明浏览器加载**）。

## 截图（当前标签 `61bedc`）

差量 run 仅新拍 `candidate-delta-focus-tooltip-61bedc.png`；亮色/暗色/表单/窄屏矩阵 **继承** `b72f034` 标签 PNG（见 JSON `inheritedVisualEvidence`）。

## 截图（历史标签 `b72f034`）

- **亮色 users**：在交互/抽屉/遮罩 **之前**拍摄（`cleanBaseline.ok`）
- 窄屏 **open** / **closed** 分图（字节长不同）
- 旧 `f84d4bd` 截图 **未**声称与本轮 HEAD 等同

## Skeleton

Admin 未使用 `PtTable` loading/skeleton → **`skeletonIntegration: not_applicable`**

## GitHub Pages

见 [GITHUB_PAGES_PROPOSAL.md](./GITHUB_PAGES_PROPOSAL.md) — **提案 only**，未启用。