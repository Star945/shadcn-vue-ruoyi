# 贡献指南

感谢你关注这个项目。

本仓库是一个前后端一体工程，前端基于 `Vue 3 + shadcn-vue + Tailwind CSS v4`，后端基于 `NestJS + Prisma`。为了避免后续协作重新回到“页面重复、规则分散、协议分叉”的状态，提交前请先阅读以下文档：

- [设计需求文档](./docs/design-requirements.md)
- [开发与维护规范](./docs/development-maintenance-guide.md)
- [部署与初始化文档](./docs/deployment-initialization-guide.md)
- [部署方案文档](./docs/deployment-runtime-guide.md)
- [发布清单](./docs/release-checklist.md)

## 开始之前

### 环境要求

- Node.js 20+
- pnpm 10+
- MySQL 8+
- Redis 7+

### 本地初始化

```bash
pnpm install
cp .env.example .env.development
cp apps/server/.env.example apps/server/.env
pnpm server:prisma:generate
pnpm server:prisma:push
pnpm server:seed
```

### 常用命令

```bash
pnpm dev
pnpm build
pnpm server:build
pnpm server:start
```

## 提交前要求

### 1. 先确认是否已有共享能力

新增需求前，请先检查这些共享层是否已经能承接：

- 表格：`src/components/admin/AdminDataTable.vue`
- 表格操作栏：`src/components/admin/AdminTableActions.vue`
- 查询区：`src/components/admin/AdminQueryPanel.vue`
- 卡片壳：`src/components/admin/AdminSectionCard.vue`
- 弹窗壳：`src/components/admin/AdminDialogContent.vue`
- 路由兼容：`src/router/backend-route-map.ts`
- 导航树：`src/stores/navigation.ts`

不要为了赶功能在单页里复制一套近似实现。

### 2. 保持前后端契约稳定

如果你修改了接口、权限键、动态路由、导出、上传或树结构写入逻辑，请同时检查：

- 前端请求路径是否仍兼容
- 后端响应结构是否仍保持若依风格
- mock 回退和 Prisma 路径是否行为一致

### 3. 提交前至少执行

```bash
pnpm build
pnpm server:prisma:generate
pnpm server:build
pnpm server:seed -- --check
```

如果改动涉及前后端联调，请额外自测：

- `login / getInfo / getRouters`
- 受影响页面的新增、修改、删除、导出
- 大弹窗滚动、移动端、小屏交互

## 分支与提交建议

### 分支命名

推荐使用以下前缀：

- `feat/`
- `fix/`
- `refactor/`
- `docs/`
- `chore/`

### 提交信息

建议使用简短、可检索的中文或英文描述，例如：

- `feat: 补齐公告富文本图片上传`
- `fix: 修复用户管理移动端筛选区布局`
- `docs: 补充部署与初始化文档`

## Pull Request 要求

提交 PR 时请尽量包含：

- 改动目的
- 影响范围
- 是否涉及前后端协议变更
- 是否涉及移动端或主题系统
- 自测结果
- UI 改动截图或录屏

如果 PR 涉及：

- 动态路由
- 权限
- 上传
- 导出
- 代码生成
- 共享组件

请在描述中明确说明兼容性影响。

## Issue 建议

提交问题时请尽量提供：

- 复现步骤
- 实际结果
- 期望结果
- 浏览器 / 系统环境
- 控制台报错
- 相关截图

如果是联调问题，请说明：

- 前端分支
- 后端分支
- 数据库是否已初始化
- 是否使用 seed 数据

## 注释与文档要求

- 注释优先解释“为什么这样做”
- 不要写重复代码语义的无效注释
- 修改共享组件、路由兼容、导航树、上传/导出、回退策略时，请补必要注释
- 新增模块或重大改动时，请同步更新 `README` 或 `docs/`

## 不建议的改动方式

- 在页面内重复写一套查询区、表格操作栏、弹窗壳
- 写死主题颜色、圆角、阴影，绕开主题系统
- 只改 Prisma 路径，不改 mock 回退
- 引入新的局部协议，导致前后端语义分叉

## 结论

欢迎贡献，但请优先维护结构稳定性、共享能力和长期可维护性，而不是只追求局部页面快速可用。