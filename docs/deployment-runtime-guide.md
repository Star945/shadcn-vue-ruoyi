# 部署方案文档

## 1. 文档目的

本文档用于补充当前项目的可执行部署方案，覆盖 Docker Compose、PM2 和 Nginx 两类常见场景。

建议与以下文档配合阅读：

- [部署与初始化文档](./deployment-initialization-guide.md)
- [开发与维护规范](./development-maintenance-guide.md)

## 2. 方案选择建议

### 2.1 开发与测试环境

优先使用：

- `docker-compose.yml`

适合：

- 一键拉起 MySQL、Redis、NestJS、前端静态站点
- 本地演示
- 测试环境联调

### 2.2 轻量生产环境

优先使用：

- 前端静态文件 + Nginx
- 后端 PM2 守护进程

适合：

- 单机部署
- 已有 Node 运行环境
- 希望手动控制 MySQL 与 Redis

## 3. Docker Compose 方案

### 3.1 文件说明

- [docker-compose.yml](../docker-compose.yml)
- [Dockerfile.web](../Dockerfile.web)
- [apps/server/Dockerfile](../apps/server/Dockerfile)
- [deploy/nginx/frontend.conf](../deploy/nginx/frontend.conf)
- [.dockerignore](../.dockerignore)

### 3.2 服务组成

Compose 默认包含：

- `mysql`
- `redis`
- `server`
- `web`

其中：

- `web` 对外暴露 `8080`
- `server` 对外暴露 `3000`
- `mysql` 对外暴露 `3306`
- `redis` 对外暴露 `6379`

### 3.3 使用步骤

```bash
docker compose build
docker compose up -d
```

首次启动后，再进入后端容器执行数据库初始化：

```bash
docker compose exec server pnpm prisma:push
docker compose exec server pnpm seed
```

访问地址：

- 前端：`http://127.0.0.1:8080`
- 后端：`http://127.0.0.1:3000`
- Swagger：`http://127.0.0.1:8080/docs`

### 3.4 持久化说明

Compose 已经为这些数据使用命名卷：

- `mysql-data`
- `redis-data`
- `server-uploads`

其中 `server-uploads` 对应后端上传目录，不能在部署时随意清空。

## 4. PM2 + Nginx 方案

### 4.1 前端部署

构建前端：

```bash
pnpm build
```

将 `dist/` 发布到静态目录，例如：

```text
/var/www/ruoyi-modern/dist
```

### 4.2 后端部署

初始化后端：

```bash
pnpm server:prisma:generate
pnpm server:prisma:push
pnpm server:seed
pnpm server:build
```

使用 PM2 启动：

```bash
pm2 start deploy/pm2/ecosystem.config.cjs
pm2 save
```

配置文件：

- [deploy/pm2/ecosystem.config.cjs](../deploy/pm2/ecosystem.config.cjs)

### 4.3 Nginx 配置

生产环境可直接参考：

- [deploy/nginx/ruoyi-modern.conf](../deploy/nginx/ruoyi-modern.conf)

该配置已经包含：

- 前端 SPA 回退
- `/prod-api` 反向代理
- `/profile/upload` 静态上传代理
- `/docs`、`/v3/api-docs`、`/druid` 代理

## 5. 环境变量建议

### 5.1 前端生产环境

推荐保持：

```env
VITE_APP_ENV=production
VITE_APP_BASE_API=/prod-api
```

### 5.2 后端生产环境

至少确认：

- `DATABASE_URL`
- `JWT_SECRET`
- `PORT`
- `REDIS_URL`

如果上线环境不启用 Redis，也建议保留变量结构，便于后续切换。

## 6. 发布前检查

发布前至少确认：

- 前端 `pnpm build` 通过
- 后端 `pnpm --filter @ruoyi-modern/server build` 通过
- `pnpm --filter @ruoyi-modern/server seed -- --check` 可正常执行
- 登录、动态路由、上传、公告、任务、代码生成可访问
- `/docs` 与 `/druid/login.html` 是否需要限制访问

## 7. 结论

当前仓库已经具备：

- 本地一键联调初始化能力
- Docker Compose 演示部署方案
- PM2 + Nginx 轻量生产部署方案

后续如果继续收口，建议再补：

1. Prisma migration 正式化
2. CI/CD 发布脚本
3. 容器镜像发布说明
4. HTTPS 与反向代理安全策略