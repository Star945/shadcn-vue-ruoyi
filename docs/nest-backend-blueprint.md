# NestJS 配套后台蓝图

## 目标

为当前 `shadcn-vue-ruoyi` 前端提供一套可落地的 NestJS 后端，优先保证以下目标：

- 与当前前端已经接入的若依接口语义兼容。
- 与若依后台的信息架构、权限模型、菜单模型保持一致。
- 支持后续逐步替换 Java 后端，而不是一次性推倒重来。
- 保留若依式模块划分和权限字符串，降低迁移成本。

## 设计原则

### 1. 以后端接口契约兼容优先

这套后端不建议对着经典 `RuoYi` Shiro 版逐行翻译，而是应该对齐当前前端实际依赖的前后端分离接口。

优先兼容的契约是：

- `/login`
- `/register`
- `/logout`
- `/getInfo`
- `/getRouters`
- `/captchaImage`
- `/common/upload`
- `system/*`
- `monitor/*`
- `tool/*`

### 2. 以后续迁移和运维为导向

NestJS 后端不应该只是“能跑”，而应该具备：

- 清晰模块边界
- 统一鉴权与权限校验
- 可观测日志链路
- 可替换存储与缓存实现
- 可逐模块对接现有若依数据库

### 3. 数据模型尽量兼容若依

如果目标是承接现有若依业务数据，推荐优先沿用若依常见表名和主字段，而不是重新发明一套全新表结构。

这样可以显著降低：

- 数据迁移成本
- 前端接口改动成本
- 后台菜单与权限同步成本

## 建议技术栈

- NestJS
- Prisma
- MySQL
- Redis
- JWT + Passport
- Swagger
- BullMQ 或 `@nestjs/schedule`
- `class-validator` + `class-transformer`
- `multer` 处理上传

如果你更看重“兼容若依数据库结构”，优先用 Prisma。  
如果你更看重“复杂 SQL 和树结构查询可控”，也可以改成 TypeORM 或 Kysely，但第一选择仍建议 Prisma。

## 推荐目录结构

建议直接在当前仓库旁边单独建后端仓库，或者在现有仓库中增加一个 `apps/server`：

```text
apps/server
├─ src
│  ├─ main.ts
│  ├─ app.module.ts
│  ├─ common
│  │  ├─ decorators
│  │  ├─ guards
│  │  ├─ interceptors
│  │  ├─ filters
│  │  ├─ dto
│  │  └─ utils
│  ├─ infra
│  │  ├─ prisma
│  │  ├─ redis
│  │  ├─ storage
│  │  └─ queue
│  ├─ auth
│  ├─ system
│  │  ├─ user
│  │  ├─ role
│  │  ├─ menu
│  │  ├─ dept
│  │  ├─ post
│  │  ├─ dict
│  │  ├─ config
│  │  └─ notice
│  ├─ monitor
│  │  ├─ online
│  │  ├─ logininfor
│  │  ├─ operlog
│  │  ├─ job
│  │  ├─ job-log
│  │  ├─ cache
│  │  └─ server
│  └─ tool
│     ├─ gen
│     ├─ swagger
│     └─ upload
├─ prisma
│  ├─ schema.prisma
│  └─ migrations
└─ test
```

## 核心模块划分

## 认证与会话模块

职责：

- 登录
- 注册
- 退出登录
- 用户信息获取
- 动态路由返回
- 验证码
- 锁屏解锁

建议接口：

- `POST /login`
- `POST /register`
- `POST /logout`
- `GET /getInfo`
- `GET /getRouters`
- `GET /captchaImage`
- `POST /unlockscreen`

建议输出语义：

### `/login`

返回：

```json
{
  "code": 200,
  "msg": "操作成功",
  "token": "..."
}
```

### `/getInfo`

返回：

```json
{
  "code": 200,
  "msg": "操作成功",
  "permissions": ["system:user:list"],
  "roles": ["admin"],
  "user": {
    "userId": 1,
    "userName": "admin",
    "nickName": "若依",
    "avatar": "..."
  }
}
```

### `/getRouters`

必须返回树形结构，且字段语义与当前前端保持一致：

- `path`
- `name`
- `hidden`
- `component`
- `redirect`
- `alwaysShow`
- `meta.title`
- `meta.icon`
- `meta.noCache`
- `meta.link`

## 系统管理模块

### 用户模块

职责：

- 用户分页查询
- 用户详情
- 新增 / 修改 / 删除
- 状态切换
- 重置密码
- 个人资料
- 头像上传
- 分配角色
- 部门树筛选

当前前端依赖接口：

- `GET /system/user/list`
- `GET /system/user/:userId`
- `POST /system/user`
- `PUT /system/user`
- `DELETE /system/user/:userId`
- `GET /system/user/export`
- `PUT /system/user/resetPwd`
- `PUT /system/user/changeStatus`
- `GET /system/user/profile`
- `PUT /system/user/profile`
- `PUT /system/user/profile/updatePwd`
- `POST /system/user/profile/avatar`
- `GET /system/user/authRole/:userId`
- `PUT /system/user/authRole`
- `GET /system/user/deptTree`

### 角色模块

职责：

- 角色分页查询
- 角色菜单权限
- 数据权限
- 分配用户

接口：

- `GET /system/role/list`
- `GET /system/role/:roleId`
- `POST /system/role`
- `PUT /system/role`
- `PUT /system/role/dataScope`
- `PUT /system/role/changeStatus`
- `DELETE /system/role/:roleId`
- `GET /system/role/export`
- `GET /system/role/authUser/allocatedList`
- `GET /system/role/authUser/unallocatedList`
- `PUT /system/role/authUser/cancel`
- `PUT /system/role/authUser/cancelAll`
- `PUT /system/role/authUser/selectAll`
- `GET /system/role/deptTree/:roleId`

### 菜单模块

职责：

- 菜单树维护
- 路由元信息维护
- 角色菜单树返回

接口：

- `GET /system/menu/list`
- `GET /system/menu/:menuId`
- `GET /system/menu/treeselect`
- `GET /system/menu/roleMenuTreeselect/:roleId`
- `POST /system/menu`
- `PUT /system/menu`
- `PUT /system/menu/updateSort`
- `DELETE /system/menu/:menuId`

### 部门模块

接口：

- `GET /system/dept/list`
- `GET /system/dept/:deptId`
- `GET /system/dept/list/exclude/:deptId`
- `GET /system/dept/treeselect`
- `GET /system/dept/roleDeptTreeselect/:roleId`
- `POST /system/dept`
- `PUT /system/dept`
- `DELETE /system/dept/:deptId`

### 岗位模块

接口：

- `GET /system/post/list`
- `GET /system/post/:postId`
- `POST /system/post`
- `PUT /system/post`
- `DELETE /system/post/:postId`
- `GET /system/post/export`
- `GET /system/post/optionselect`

### 字典模块

接口：

- `GET /system/dict/type/list`
- `GET /system/dict/type/:dictId`
- `POST /system/dict/type`
- `PUT /system/dict/type`
- `DELETE /system/dict/type/:dictId`
- `GET /system/dict/type/export`
- `DELETE /system/dict/type/refreshCache`
- `GET /system/dict/type/optionselect`

- `GET /system/dict/data/list`
- `GET /system/dict/data/:dictCode`
- `POST /system/dict/data`
- `PUT /system/dict/data`
- `DELETE /system/dict/data/:dictCode`
- `GET /system/dict/data/export`

### 参数模块

接口：

- `GET /system/config/list`
- `GET /system/config/:configId`
- `POST /system/config`
- `PUT /system/config`
- `DELETE /system/config/:configId`
- `GET /system/config/export`
- `DELETE /system/config/refreshCache`

### 公告模块

接口：

- `GET /system/notice/list`
- `GET /system/notice/:noticeId`
- `POST /system/notice`
- `PUT /system/notice`
- `DELETE /system/notice/:noticeId`
- `GET /system/notice/listTop`
- `POST /system/notice/markRead`
- `POST /system/notice/markReadAll`

## 系统监控模块

### 在线用户

- `GET /monitor/online/list`
- `DELETE /monitor/online/:tokenId`

### 登录日志

- `GET /monitor/logininfor/list`
- `GET /monitor/logininfor/unlock/:userName`
- `DELETE /monitor/logininfor/:infoId`
- `DELETE /monitor/logininfor/clean`
- `GET /monitor/logininfor/export`

### 操作日志

- `GET /monitor/operlog/list`
- `DELETE /monitor/operlog/:operId`
- `DELETE /monitor/operlog/clean`
- `GET /monitor/operlog/export`

### 定时任务

- `GET /monitor/job/list`
- `GET /monitor/job/:jobId`
- `POST /monitor/job`
- `PUT /monitor/job`
- `DELETE /monitor/job/:jobId`
- `PUT /monitor/job/changeStatus`
- `PUT /monitor/job/run`
- `GET /monitor/job/export`

### 调度日志

- `GET /monitor/jobLog/list`
- `DELETE /monitor/jobLog/:jobLogId`
- `DELETE /monitor/jobLog/clean`
- `GET /monitor/jobLog/export`

### 服务与缓存

- `GET /monitor/server`
- `GET /monitor/cache`
- `GET /monitor/cache/getNames`
- `GET /monitor/cache/getKeys/:cacheName`
- `GET /monitor/cache/getValue/:cacheName/:cacheKey`
- `DELETE /monitor/cache/clearCacheName/:cacheName`
- `DELETE /monitor/cache/clearCacheKey/:cacheKey`
- `DELETE /monitor/cache/clearCacheAll`

## 系统工具模块

### 代码生成

- `GET /tool/gen/list`
- `GET /tool/gen/db/list`
- `GET /tool/gen/:tableId`
- `PUT /tool/gen`
- `POST /tool/gen/importTable`
- `POST /tool/gen/createTable`
- `GET /tool/gen/preview/:tableId`
- `DELETE /tool/gen/:tableId`
- `GET /tool/gen/genCode/:tableName`
- `GET /tool/gen/batchGenCode`
- `PUT /tool/gen/synchDb/:tableName`

### 上传与嵌入

- `POST /common/upload`
- `GET /tool/swagger/**`
- `GET /monitor/druid/**`

## 数据库表建议

如果目标是兼容若依业务数据，建议优先使用接近若依的表结构：

### 认证与系统表

- `sys_user`
- `sys_role`
- `sys_menu`
- `sys_dept`
- `sys_post`
- `sys_user_role`
- `sys_user_post`
- `sys_role_menu`
- `sys_role_dept`

### 字典与配置表

- `sys_dict_type`
- `sys_dict_data`
- `sys_config`
- `sys_notice`

### 日志与监控表

- `sys_logininfor`
- `sys_oper_log`
- `sys_job`
- `sys_job_log`

### 代码生成表

- `gen_table`
- `gen_table_column`

### 会话与验证码

建议不要单独建“在线用户表”，而是：

- 在线用户会话放 Redis
- Captcha 放 Redis
- 黑名单 token 放 Redis
- 锁屏状态可放 Redis 或 JWT 扩展声明

## 权限模型建议

沿用若依式权限字符串，不要改成资源树 + 动作枚举的全新方案。

例如：

- `system:user:list`
- `system:user:add`
- `system:user:edit`
- `system:user:remove`
- `system:user:export`
- `monitor:job:query`
- `tool:gen:edit`

原因很简单：

- 当前前端已经按这种权限模型工作。
- 后端菜单、按钮权限、隐藏页权限都能继续复用。
- 后续迁移成本最低。

## 菜单模型建议

菜单建议继续保留若依常见字段：

- `menuId`
- `parentId`
- `menuName`
- `path`
- `component`
- `query`
- `routeName`
- `isFrame`
- `isCache`
- `menuType`
- `visible`
- `status`
- `perms`
- `icon`
- `orderNum`

这样才能稳定返回 `/getRouters`，并且直接驱动前端菜单树。

## 统一响应格式建议

建议全局保持若依风格响应：

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {}
}
```

分页：

```json
{
  "code": 200,
  "msg": "查询成功",
  "rows": [],
  "total": 0
}
```

文件导出：

- 直接返回 `blob`
- 错误时返回 JSON

这点当前前端请求层已经兼容。

## 模块开发优先级

### 第一阶段：先打通登录态和导航

必须先做：

- 登录
- 获取用户信息
- 获取动态菜单
- 验证码
- 上传接口

否则前端整个后台壳层无法进入稳定联调。

### 第二阶段：系统管理主链路

优先顺序：

1. 用户
2. 角色
3. 菜单
4. 部门
5. 岗位
6. 字典
7. 参数
8. 公告

### 第三阶段：监控模块

优先顺序：

1. 在线用户
2. 登录日志
3. 操作日志
4. 定时任务
5. 调度日志
6. 服务监控
7. 缓存监控

### 第四阶段：工具模块

优先顺序：

1. 公共上传
2. 代码生成
3. Swagger 嵌入
4. Druid 嵌入

## 与当前前端的适配策略

建议不要先改前端，而是让 NestJS 后端尽量适配当前前端。

也就是说：

- 路径不改
- 字段语义尽量不改
- 权限字符串不改
- `/getRouters` 结构不改
- 列表分页格式不改
- 导出接口表现不改

只有当 NestJS 侧有明确收益时，再考虑做前端协议升级。

## 第一版交付建议

第一版 NestJS 后端建议只承诺这组能力：

- 登录 / 注册 / 验证码 / 用户信息 / 动态菜单
- 用户 / 角色 / 菜单 / 部门 / 岗位
- 字典 / 参数 / 公告
- 在线用户 / 登录日志 / 操作日志 / 定时任务
- 公共上传

把这一版做稳之后，再补缓存监控、服务监控、代码生成。

## 下一步建议

如果要正式开始写，我建议下一步直接做下面 3 件事：

1. 初始化 NestJS 工程骨架
2. 画 Prisma Schema 第一版
3. 先实现 `auth + user + role + menu + getRouters`

这样一周内就能把最关键的联调骨架跑起来。
