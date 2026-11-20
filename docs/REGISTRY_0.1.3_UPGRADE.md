# portico-ui@0.1.3 正式 registry 集成（PR #4 候选）

## Live 核准（勿信口头报告）

```bash
npm view portico-ui@0.1.3 dist.integrity dist.shasum
curl -fsSL -o /tmp/portico-ui-0.1.3.tgz \
  https://registry.npmjs.org/portico-ui/-/portico-ui-0.1.3.tgz
sha256sum /tmp/portico-ui-0.1.3.tgz
# 期望：025aa12d873dbd4bf2c1d40299394598d106b0fcd32833ea9430bba5d0040db4
```

## Admin 跟踪依赖

- `package.json`: `"portico-ui": "0.1.3"`
- `package-lock.json`: `resolved` → registry tarball，`integrity` 与 packument 一致
- **禁止** `file:` / 候选 tgz 安装

## 证据脚本

```bash
mkdir -p /opt/cursor/artifacts
NPM_CONFIG_CACHE=/tmp/npm-cache-verify-013-empty npm ci
ADMIN_GIT_SHA=$(git rev-parse HEAD) npm run verify:registry-install
npm run typecheck && npm test && npm run build:pages && npm run smoke:pages-static
```

产物：`registry-install-verification-0.1.3.json`、`pages-static-route-regression/pages-static-route-regression.json`