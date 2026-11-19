# Portico Admin

基于 npm 包 [portico-ui](https://www.npmjs.com/package/portico-ui) **0.1.0** 的演示型管理后台（Vue 3 + TypeScript + Vite + vue-router）。本仓库为 MIT 应用代码，**不会**发布到 npm。

[English](./README.md) | [简体中文](./README.zh-CN.md)

## 功能

- 默认中文界面：响应式 **侧栏 / 顶栏 / 内容区**、面包屑、`vue-router` 路由
- **概览**：标注清晰的演示指标
- **用户列表**：搜索、筛选、自定义排序、分页、编辑 **抽屉**（仅内存）
- **示例表单**：`PtForm` 校验，含下拉、开关、日期选择
- **设置**：明 / 暗主题切换（`localStorage` 持久化）
- 通过 `import 'portico-ui/style.css'` 引入官方样式，不 fork / 不 patch 组件库

## 环境

- Node.js 20+（CI 使用 22）
- npm

## 脚本

| 命令 | 说明 |
| --- | --- |
| `npm install` | 安装依赖（固定 `portico-ui@0.1.0`） |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm test` | Vitest 单元测试 |
| `npm run preview` | 预览构建产物 |

## 本地启动

```bash
npm install
npm run dev
```

在终端提示的地址打开（默认 `http://localhost:5173`）。

## 目录说明

```
src/
  layouts/AdminLayout.vue   # 外壳：导航、顶栏、面包屑、主题开关
  views/                    # 概览、用户、表单示例、设置
  composables/useTheme.ts   # 明暗主题 + localStorage
  data/demoUsers.ts         # 演示种子数据（id 为 string，避免 Long 精度问题）
  utils/userFilters.ts      # 搜索 / 筛选 / 排序（含测试）
```

## 主题

暗色遵循 portico-ui：`html.pt-dark`；应用在 `pt-theme` 根壳层使用 `[data-pt-theme="dark"]`（见 `AdminLayout`）。偏好键：`portico-admin-theme`。

字体：通过 `@fontsource/noto-sans-sc`（OFL）自托管 Noto Sans SC 400/500。

## 候选 portico-ui 包验证

新版组件库合并前，可用 tarball 临时冒烟，**不**改动 `package.json` 跟踪依赖：见 [docs/PORTICO_UI_CANDIDATE_VALIDATION.md](./docs/PORTICO_UI_CANDIDATE_VALIDATION.md)。

## 数据与鉴权

所有增删改查均为 **内存或 localStorage 演示**，无后端、无登录、无生产鉴权声明。

## 许可证

MIT — 见 [LICENSE](./LICENSE)。

## 关联

- 组件库：`portico-ui@0.1.0`（请勿在本应用中修改其源码仓库）。