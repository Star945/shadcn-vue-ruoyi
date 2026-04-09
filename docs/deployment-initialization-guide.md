# 部署与初始化文档

## 1. 文档目的

本文档用于整理当前仓库在本地联调、测试环境部署和生产准备阶段的初始化步骤、环境要求、数据库准备、启动顺序和验收检查项。

它与 [设计需求文档](./design-requirements.md) 和 [开发与维护规范](./development-maintenance-guide.md) 的关系是：

- 设计需求文档：说明项目要做什么
- 开发与维护规范：说明后续如何继续开发
- 部署与初始化文档：说明项目如何被真正跑起来、交付出去并持续维护

## 2. 适用范围

适用目录：

- `src/` 前端工程
- `apps/server/` NestJS 后端工程
- `docs/` 交付与维护文档

适用场景：

- 新环境初始化
- 本地前后端联调
- 测试环境部署
- 生产环境上线前准备
- 交接给新维护者

## 3. 运行环境要求

### 3.1 基础环境

推荐版本：

- Node.js：`>= 20`
- pnpm：建议与当前 lockfile 配套版本保持一致
- MySQL：`8.0+`
- Redis：当前版本不是硬依赖，但保留了环境变量入口，后续接入真实 Redis 时可直接扩展

### 3.2 目录约定

当前仓库是前后端一体结构：

```text
.
├─ src/                 # Vue 3 前端
├─ apps/server/         # NestJS 后端
├─ docs/                # 设计、交付、维护文档
├─ public/
├─ package.json
└─ pnpm-workspace.yaml
```

### 3.3 对外访问约定

默认本地开发端口：

- 前端：`http://127.0.0.1:5173`
- 后端：`http://127.0.0.1:3000`
- Swagger：`http://127.0.0.1:3000/docs`
- Druid 兼容页：`http://127.0.0.1:3000/druid/login.html`
- 上传文件访问前缀：`http://127.0.0.1:3000/profile/upload/...`

## 4. 环境变量说明

### 4.1 前端环境变量

前端示例文件：[`../.env.example`](../.env.example)

常用字段：

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `VITE_APP_TITLE` | 页面标题 | `RuoYi Modern 后台` |
| `VITE_APP_ENV` | 环境标识 | `development` |
| `VITE_APP_BASE_API` | 前端请求前缀 | `/dev-api` |
| `VITE_APP_DEV_PROXY_TARGET` | 开发代理后端地址 | `http://127.0.0.1:3000` |

前端开发时，`vite.config.ts` 会把：

- `/dev-api` 代理到后端
- `/profile/upload` 代理到后端静态文件
- `/v3/api-docs/*` 代理到后端 Swagger

### 4.2 后端环境变量

后端示例文件：[`../apps/server/.env.example`](../apps/server/.env.example)

| 变量 | 说明 | 示例 |
| --- | --- | --- |
| `PORT` | 后端监听端口 | `3000` |
| `APP_NAME` | 服务名称 | `RuoYi Modern Server` |
| `DATABASE_URL` | Prisma/MySQL 连接串 | `mysql://root:root@127.0.0.1:3306/ruoyi_modern` |
| `REDIS_URL` | 预留 Redis 连接串 | `redis://127.0.0.1:6379` |
| `JWT_SECRET` | JWT 密钥 | `replace-with-a-strong-secret` |
| `UPLOAD_DIR` | 预留上传目录配置 | `uploads` |

说明：

- 当前代码中的上传实际落盘目录固定在 `apps/server/uploads`，后续如果要完全由环境变量驱动，可在上传服务中进一步抽象。
- 当前缓存、在线会话和部分监控能力仍保留内存回退逻辑，因此 Redis 不是启动必要条件。

## 5. 数据库初始化

### 5.1 创建数据库

先在 MySQL 中创建数据库，推荐字符集使用 `utf8mb4`：

```sql
CREATE DATABASE ruoyi_modern DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```

### 5.2 当前 Prisma 状态说明

当前仓库已经维护了完整的 Prisma schema：

- `sys_user`
- `sys_role`
- `sys_menu`
- `sys_dept`
- `sys_post`
- `sys_dict_type`
- `sys_dict_data`
- `sys_config`
- `sys_notice`
- `sys_notice_read`
- `sys_logininfor`
- `sys_oper_log`
- `sys_job`
- `sys_job_log`
- 以及关联表与代码生成相关表

当前仓库**尚未提交 Prisma migrations 目录**，因此第一次初始化数据库时，推荐使用 `db push` 直接把 schema 同步到数据库。

### 5.3 本地初始化数据库结构

在仓库根目录执行：

```bash
pnpm install
pnpm server:prisma:generate
pnpm server:prisma:push
pnpm server:seed
```

说明：

- `server:prisma:generate` 用于生成 Prisma Client
- `server:prisma:push` 用于把当前 schema 直接推送到数据库
- 如果后续要正式维护 migration，再使用 `prisma migrate dev` 生成首批迁移文件

### 5.4 初始化数据建议

当前后端支持 `Prisma 优先 + mock 回退` 双轨模式：

- 数据库有数据时，优先走真实数据
- 数据库不可用或对应表为空时，部分模块会回退到 mock 数据，保证联调不断链

因此，测试环境建议至少准备这些基础数据：

- 管理员账号
- 基础角色
- 顶层菜单树
- 基础部门
- 基础岗位
- 基础字典类型和字典数据

如果当前环境还没有初始化 SQL，可以先用 mock 链路完成联调，再逐步补真实种子数据。
### 5.5 初始化基础种子数据

完成 `db push` 后，建议执行：

```bash
pnpm server:seed
```

该命令会写入一套适合联调和演示的基础数据，包括：

- 管理员与演示账号
- 基础角色、菜单、部门、岗位
- 字典类型与字典数据
- 参数设置与通知公告
- 定时任务基础样例

默认账号：

- `admin / admin123`
- `ry / 123456`

说明：

- 种子脚本按固定主键做 `upsert`，可以重复执行。
- 关联表会按种子用户和种子角色重建，避免重复关系。
- 该脚本适合本地、测试和演示环境，不建议直接对生产数据执行。

## 6. 本地启动顺序

### 6.1 安装依赖

```bash
pnpm install
```

### 6.2 配置前端环境

复制前端环境文件：

```bash
cp .env.example .env.development
```

Windows 环境可直接手工复制同名文件。

### 6.3 配置后端环境

复制后端环境文件：

```bash
cp apps/server/.env.example apps/server/.env
```

并按实际数据库地址修改 `DATABASE_URL` 与 `JWT_SECRET`。

### 6.4 初始化 Prisma

```bash
pnpm server:prisma:generate
pnpm server:prisma:push
pnpm server:seed
```

### 6.5 启动后端

```bash
pnpm server:build
pnpm server:start
```

### 6.6 启动前端

```bash
pnpm dev
```

### 6.7 本地联调检查点

启动成功后，至少检查：

- `http://127.0.0.1:3000/captchaImage`
- `http://127.0.0.1:3000/docs`
- `http://127.0.0.1:3000/druid/login.html`
- 前端登录页是否可正常请求验证码
- 登录后是否能获取 `getInfo` 和 `getRouters`

## 7. 上传目录与静态资源

### 7.1 上传目录

当前上传服务会把文件写入：

```text
apps/server/uploads/
```

按业务类型继续分层：

- `common/yyyy/MM/dd/*`
- `avatar/yyyy/MM/dd/*`

### 7.2 对外访问

后端通过 Nest 静态资源服务，把上传目录挂到：

```text
/profile/upload/*
```

这意味着：

- 前端开发态可直接通过 Vite 代理访问
- 生产环境需要由反向代理或 Node 服务保证该路径可访问

### 7.3 部署建议

上线时不要把上传目录放在临时磁盘或会被发布覆盖的目录中。推荐：

- 保留独立持久化卷
- 定时备份 `uploads/`
- 反向代理中放行 `/profile/upload/`

## 8. 生产部署建议

### 8.1 前端部署

构建前端：

```bash
pnpm build
```

输出目录：

```text
dist/
```

可以部署到：

- Nginx 静态站点
- OSS/CDN 静态托管
- 容器镜像中的静态目录

如果前端与后端不在同域，需要重新确认：

- API 前缀
- 上传访问路径
- Swagger 嵌入地址
- CORS 策略

### 8.2 后端部署

构建后端：

```bash
pnpm server:build
```

启动后端：

```bash
pnpm server:start
```

输出目录：

```text
apps/server/dist/
```

推荐部署方式：

- Node 进程守护：PM2 / systemd
- Docker 容器
- 与 MySQL 保持低延迟网络

### 8.3 反向代理建议

生产环境建议统一由 Nginx 或同类代理收口这些路径：

- `/` -> 前端静态资源
- `/dev-api` 或实际 API 根路径 -> NestJS 服务
- `/profile/upload/` -> 后端静态上传目录
- `/docs` -> Swagger
- `/druid/login.html` -> Druid 兼容诊断页

### 8.4 文档与诊断页策略

生产环境建议限制以下入口的访问：

- `/docs`
- `/druid/login.html`

可选方式：

- 内网访问
- 基础认证
- 白名单 IP
- 网关层权限控制

## 9. 联调与验收清单

### 9.1 认证链路

- 登录
- 注册
- 锁屏
- 获取用户信息
- 获取动态路由
- 退出登录

### 9.2 系统管理

- 用户、角色、菜单、部门、岗位
- 字典类型、字典数据
- 参数设置
- 通知公告
- 个人中心

### 9.3 监控模块

- 在线用户
- 登录日志
- 操作日志
- 定时任务
- 调度日志
- 缓存监控
- 服务监控
- Druid 兼容页

### 9.4 工具模块

- 文件上传
- 代码生成
- Swagger
- 表单构建

### 9.5 前端体验

- 动态菜单
- TagsView
- 面包屑
- 主题切换
- 布局设置
- 移动端适配
- 弹窗滚动
- 表格操作栏

## 10. 维护与升级建议

### 10.1 数据库迁移

当前仓库适合联调和继续开发，但如果要长期维护，建议尽快补齐：

- 首批 Prisma migration 文件
- 初始化种子数据
- 发布环境数据库变更流程

### 10.2 配置集中化

建议后续把这些能力继续收口：

- 上传根目录由环境变量完全驱动
- Redis 会话与缓存适配器
- JWT 过期时间、刷新策略
- 后端运行级别日志配置

### 10.3 发布前最少检查项

每次发布前至少执行：

```bash
pnpm build
pnpm server:build
```

并抽查：

- 登录与动态路由
- 用户管理增改删查
- 角色和菜单权限链
- 上传与头像修改
- 公告富文本提交
- 定时任务与调度日志
- 代码生成预览与下载

## 11. 结论

当前仓库已经具备：

- 前后端一体联调能力
- 真实数据库优先实现
- 数据库不可用时的回退联调能力
- 面向交接和开源的基础文档体系

后续如果继续交付到测试或生产环境，应优先补齐：

1. Prisma migration
2. 初始化数据
3. 部署脚本或容器方案
4. 发布流程与回滚策略