# portico-ui@0.1.2 正式 registry 升级（Admin PR #1）

> **未** merge / deploy / 启用 GitHub Pages / 在 admin 侧发 npm。

## 批准溯源（发布方 / Lead）

| 字段 | 值 |
| --- | --- |
| runtime implementation | `b4c202d74862311f7bfc276d0fa25ba6f23ceaec` |
| 证据脚本 HEAD | `b346428de578a50b6556a5a14716b3d49188b72f` |
| 批准 tarball SHA256 | `6f236774f1ed67b6aaf476891f51c3aa0fe9cda627b3af2d1aba16bbec9e52e5` |
| npm `dist.shasum` | `379446a3072b8f76ce37a88c9b015ebc0ea58c8e` |
| lock `integrity` | `sha512-xRXiAko1wO6+OdYklDaT9TMnd+04zXLNCgoGhYvN0Xa+eo8Fm2DHj7Y9CmCEyd7Hf8PsmceJc3hjhMZOarnCDg==` |

附件 `portico-ui-0.1.2_*.tgz` **仅**用于与 packument / `node_modules` dist 字节比对，**不得**代替 registry 安装。

## 独立只读核实

```bash
npm view portico-ui dist-tags.latest version
npm view portico-ui@0.1.2 dist.integrity dist.tarball
curl -sI https://registry.npmjs.org/portico-ui/-/portico-ui-0.1.2.tgz
npm pack portico-ui@0.1.2   #  tarball 未传播时可能 404
```

## 干净安装（唯一允许途径）

```bash
rm -rf node_modules node_modules/.vite
npm cache clean --force   # 可选，强化「真实拉取」
npm ci
```

`package.json` / `package-lock.json` 均为 **`portico-ui@0.1.2`**（非 `file:`、非候选覆盖）。

## 证据脚本

```bash
REFERENCE_TARBALL_COMPARE_ONLY=/path/to/compare-only.tgz SKIP_NPM_CI_IN_VERIFY=1 \
  ADMIN_GIT_SHA=$(git rev-parse HEAD) node scripts/registry-install-verification.mjs

# 正式安装成功后：
REGISTRY_EVIDENCE=1 ADMIN_GIT_SHA=$(git rev-parse HEAD) node scripts/candidate-regression.mjs
REGISTRY_EVIDENCE=1 ADMIN_GIT_SHA=$(git rev-parse HEAD) node scripts/capture-ui-regression.mjs
```

产物：`registry-install-verification-0.1.2.json`、`registry-ui-regression-registry-0.1.2.json`、`registry-delta-focus-tooltip-registry-0.1.2.png` 等 — **不**复用 P2 候选截图。

## 历史候选

`docs/PORTICO_UI_CANDIDATE_VALIDATION.md` 中的 0.1.1 PREPARED 流程仅供存档，**不**代表当前跟踪依赖。