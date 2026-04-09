# RuoYi Modern Server

> 部署、环境变量、数据库初始化和上线前检查请配合阅读 [部署与初始化文档](../../docs/deployment-initialization-guide.md)。

`apps/server` 是当前前端项目配套的 NestJS 后端，目标不是照搬若依 Java 实现，而是对齐若依后台的业务语义、权限模型和接口契约，让当前前端可以直接联调。

## 模块覆盖

- 认证：`login / register / logout / getInfo / getRouters / captchaImage / unlockscreen`
- 系统管理：`user / role / menu / dept / post / dict / config / notice`
- 系统监控：`online / logininfor / operlog / job / job-log / cache / server / druid`
- 系统工具：`tool/gen`
- 通用能力：`common/upload`、CSV 导出、Swagger 文档、静态文件访问

## 实现策略

- **Prisma 优先**：数据库可用时优先使用真实表数据。
- **Mock 回退**：数据库不可用时自动回退到内存态 mock，方便前后端先联调。
- **若依响应格式**：接口返回保持若依常见的 `code / msg / data / rows / total` 结构。

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境

复制 [`.env.example`](./.env.example) 为 `.env`，按实际环境修改：

```env
PORT=3000
APP_NAME=RuoYi Modern Server
DATABASE_URL="mysql://root:root@127.0.0.1:3306/ruoyi_modern"
REDIS_URL="redis://127.0.0.1:6379"
JWT_SECRET="replace-with-a-strong-secret"
UPLOAD_DIR="uploads"
```

### 3. 初始化 Prisma

```bash
pnpm --filter @ruoyi-modern/server prisma:generate
pnpm --filter @ruoyi-modern/server prisma:push
pnpm --filter @ruoyi-modern/server seed
```

### 4. 构建并启动

```bash
pnpm --filter @ruoyi-modern/server build
pnpm --filter @ruoyi-modern/server start
```

启动后默认地址：

- API：`http://127.0.0.1:3000`
- Swagger：`http://127.0.0.1:3000/docs`
- 上传文件：`http://127.0.0.1:3000/profile/upload/...`
- Druid 兼容页：`http://127.0.0.1:3000/druid/login.html`

默认账号：

- `admin / admin123`
- `ry / 123456`

## 当前已打通链路

- 登录、获取用户信息、动态路由
- 用户 / 角色 / 菜单 / 部门 / 岗位 增删改查
- 字典、参数、公告增删改查
- 在线用户、登录日志、操作日志、定时任务、调度日志
- 缓存监控、服务监控
- 代码生成、上传、Swagger
- CSV 导出与文件下载

## 当前边界

- `tool/gen` 的 `db/list` 已支持数据库扫描，但生成逻辑仍是若依语义优先，不是完整 Java 代码生成替代品。
- `druid` 是 Nest 诊断页兼容实现，不是原版 Druid 控制台。
- 数据库不可用时会回退到 mock，这适合联调，不适合直接上线。

## 相关文档

- [部署与初始化文档](../../docs/deployment-initialization-guide.md)
- [后端架构蓝图](../../docs/nest-backend-blueprint.md)
- [项目交付状态](../../docs/delivery-status.md)
- [开发与维护规范](../../docs/development-maintenance-guide.md)