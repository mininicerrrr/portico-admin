# portico-ui 候选包临时集成验证（portico-admin）

> **跟踪依赖不变**：`package.json` 仍固定 [npm `portico-ui@0.1.0`](https://www.npmjs.com/package/portico-ui)。  
> **PREPARED 候选 `0.1.1` 未公开发布**；不得 merge / deploy / 发 npm / 启用 Pages。

## 候选来源（当前 P2）

| 项 | 值 |
| --- | --- |
| **implementationSourceCommitSha** | `b72f0341e537881640795d2d4e2e48d6dcd425c8` |
| **tarball SHA256** | `9bba3c4842f569b8bd3b17fc7fd731cd35244fc5bef3a31e350f17658d87befd`（`portico-ui-0.1.1_a95f.tgz`） |
| **取代** | `f84d4bd` / `0.1.0` tarball 等更早候选 |

## 运行要点

1. 解压 tarball → 覆盖 `node_modules/portico-ui`（**勿**改 lockfile）
2. `rm -rf node_modules/.vite` 且 `vite --force` 重启 dev
3. `npm run typecheck && npm test && npm run build`
4. `ADMIN_GIT_SHA=$(git rev-parse HEAD) node scripts/candidate-regression.mjs`
5. `ADMIN_GIT_SHA=$(git rev-parse HEAD) node scripts/capture-ui-regression.mjs`

证据 JSON 含：`installedNodeModules.fileSha256` + `browserLoadedPorticoUi`（**tarball 哈希 alone 不能证明浏览器加载**）。

## 截图（当前标签 `b72f034`）

- **亮色 users**：在交互/抽屉/遮罩 **之前**拍摄（`cleanBaseline.ok`）
- 窄屏 **open** / **closed** 分图（字节长不同）
- 旧 `f84d4bd` 截图 **未**声称与本轮 HEAD 等同

## Skeleton

Admin 未使用 `PtTable` loading/skeleton → **`skeletonIntegration: not_applicable`**

## GitHub Pages

见 [GITHUB_PAGES_PROPOSAL.md](./GITHUB_PAGES_PROPOSAL.md) — **提案 only**，未启用。