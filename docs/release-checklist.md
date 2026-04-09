# 发布清单

## 1. 文档目的

本文档用于整理项目正式开源、版本发布或交付前的最终检查项，避免遗漏构建、联调、权限、部署和文档层面的关键步骤。

建议与以下文档配合阅读：

- [设计需求文档](./design-requirements.md)
- [部署与初始化文档](./deployment-initialization-guide.md)
- [部署方案文档](./deployment-runtime-guide.md)
- [开发与维护规范](./development-maintenance-guide.md)
- [最终联调清单（精简版）](./final-acceptance-checklist.md)
- [首版发布说明](./release-notes-v1.0.0.md)
- [GitHub Release 正文（v1.0.0）](./github-release-body-v1.0.0.md)
- [GitHub 仓库信息速查](./github-publishing-snippets.md)
- [GitHub 仓库设置建议](./github-repository-setup.md)

## 2. 发布前准备

### 2.1 代码层检查

- 确认当前分支功能已合并完整
- 清理临时调试代码、控制台输出和实验文件
- 确认共享组件改动没有破坏已有页面
- 检查 `.env`、上传目录、数据库连接信息没有误提交

### 2.2 文档层检查

- `README.md` 与当前仓库能力一致
- 开源协议存在且正确
- 截图、命令、目录结构、默认端口没有过期
- 新增模块是否补充到设计文档与部署文档

## 3. 自动化检查

本地发布前至少执行：

```bash
pnpm install
pnpm build
pnpm server:prisma:generate
pnpm server:build
pnpm server:seed -- --check
```

仓库已提供基础 CI：

- [GitHub Actions CI](../.github/workflows/ci.yml)

CI 当前覆盖：

- 依赖安装
- Prisma Client 生成
- 前端构建
- 后端构建
- 种子脚本自检

## 4. 前端验收清单

### 4.1 认证与异常页

- 登录
- 注册
- 锁屏
- 401
- 404

### 4.2 导航与布局

- 动态菜单
- 面包屑
- TagsView
- 顶部导航
- 布局设置
- 主题切换
- 圆角与主题色持久化

### 4.3 核心业务页

- 用户管理
- 角色管理
- 菜单管理
- 部门管理
- 岗位管理
- 字典管理 / 字典数据
- 参数设置
- 通知公告
- 个人中心

### 4.4 监控与工具页

- 在线用户
- 登录日志
- 操作日志
- 定时任务
- 调度日志
- 缓存监控 / 缓存列表
- 服务监控
- Swagger
- Druid 兼容页
- 代码生成
- 表单构建

### 4.5 重点交互

- 查询区
- 表格操作栏
- 树结构展开收起
- 大弹窗滚动
- 富文本编辑
- 头像裁剪上传
- 顶部标签滚动
- 侧栏隐藏滚动条
- 移动端适配

## 5. 后端验收清单

### 5.1 接口链路

- `login`
- `register`
- `logout`
- `getInfo`
- `getRouters`
- `captchaImage`
- `unlockscreen`
- `common/upload`

### 5.2 系统管理接口

- `system/user`
- `system/role`
- `system/menu`
- `system/dept`
- `system/post`
- `system/dict/type`
- `system/dict/data`
- `system/config`
- `system/notice`

### 5.3 监控与工具接口

- `monitor/online`
- `monitor/logininfor`
- `monitor/operlog`
- `monitor/job`
- `monitor/job-log`
- `monitor/cache`
- `monitor/server`
- `monitor/druid`
- `tool/gen`

### 5.4 关键行为

- 导出返回真实文件流
- 上传返回相对路径
- 动态路由和权限字段与前端契约一致
- 数据库可用时优先走 Prisma
- 数据库不可用时回退路径仍可联调
- 种子脚本可重复执行且不产生脏关系

## 6. 部署检查

### 6.1 Docker Compose 方案

- `docker compose build` 能正常完成
- `docker compose up -d` 后服务健康
- `server` 能完成 `prisma:push` 与 `seed`
- `web` 可通过 `/prod-api` 正常访问后端

### 6.2 PM2 + Nginx 方案

- 前端 `dist/` 已正确发布
- PM2 能拉起 `apps/server/dist/main.js`
- Nginx 已正确转发 `/prod-api`、`/profile/upload`、`/docs`、`/druid`
- 上传目录已持久化

## 7. 开源发布检查

- 仓库名称、描述、Topics 已设置
- README 截图正常显示
- Apache-2.0 协议已包含
- 不包含敏感环境变量和真实数据库连接信息
- `CONTRIBUTING.md` 已存在并与当前结构一致
- `SECURITY.md` 与 `CODE_OF_CONDUCT.md` 已补齐
- issue / PR 模板已存在并可直接用于外部协作

## 8. 结论

当以下条件同时满足时，可以认为仓库进入可发布状态：

1. CI 通过
2. 前后端本地构建通过
3. 关键业务页点验通过
4. 初始化与部署文档可独立复现环境
5. 默认账号、上传、导出和动态路由链路可正常工作
