# 开发与维护规范

## 1. 目的

本文档用于约束当前仓库的后续开发方式，避免项目在继续迭代时重新回到“页面复制、规则分散、协议分叉、样式重复”的状态。

适用范围：

- `src/` 前端工程
- `apps/server/` 后端工程
- `docs/` 交付与设计文档

## 2. 总体原则

### 2.1 共享优先

新增需求时，优先判断是否可以复用现有共享能力：

- 表格：`src/components/admin/AdminDataTable.vue`
- 行内操作：`src/components/admin/AdminTableActions.vue`
- 查询区：`src/components/admin/AdminQueryPanel.vue`
- 卡片壳：`src/components/admin/AdminSectionCard.vue`
- 弹窗壳：`src/components/admin/AdminDialogContent.vue`
- 日期组件：`src/components/admin/AdminDatePicker.vue`、`AdminDateRangePicker.vue`
- 富文本：`src/components/admin/AdminRichTextEditor.vue`

不允许因为单页赶工而重新写一套样式相似、行为重复的新组件。

### 2.2 协议单点收敛

以下逻辑必须集中维护，不能散落到页面中重复实现：

- 后端动态路由兼容：`src/router/backend-route-map.ts`
- 导航树与菜单状态：`src/stores/navigation.ts`
- 请求与错误处理：`src/utils/request.ts`
- 权限判断：`src/lib/access.ts`、`src/lib/permission-keys.ts`
- 树结构工具：`src/lib/tree.ts`

### 2.3 数据源双轨策略

后端当前采用“Prisma 优先、mock 回退”的联调模式。

要求：

- 新增后端模块时，优先实现 Prisma 路径
- 数据库不可用时，仍要保证接口语义可联调
- 回退逻辑必须与真实接口保持同一响应结构
- 不允许出现“数据库路径能写、mock 路径不能写”的状态

## 3. 前端开发规范

### 3.1 页面组织

- 业务页保留在 `src/views/<domain>/<page>/index.vue`
- 页面只负责：状态、接口调用、业务事件编排
- 复杂结构和重复视觉必须下沉到共享组件层

### 3.2 查询区规范

- 默认不展示表单 label，使用 placeholder 表达语义
- 查询 / 重置按钮紧跟筛选项
- 查询项过多时优先用高级搜索折叠，而不是直接铺满一行
- 搜索框应设置合理最大宽度，避免超宽输入框破坏信息密度

### 3.3 表格规范

- 行内操作统一走 `AdminTableActions`
- 页面内只声明动作配置和事件，不再重复写按钮样式
- 表格支持分页、选择列、操作列时，统一交给 `AdminDataTable`
- 树表、卡片模式、小屏降级都优先扩展现有表格能力

### 3.4 弹窗规范

- 默认使用 `AdminDialogContent`
- 超高内容优先走 viewport 滚动，不要自行套多层 fixed 容器
- 表单型弹窗必须保证小屏可滚动、底部按钮可点

### 3.5 主题与样式规范

- 颜色、圆角、阴影优先走主题变量，不写死
- 不允许引入新的“局部系统色”绕开主题系统
- 滚动区统一使用项目现有滚动策略，不要回退原生粗滚动条

## 4. 后端开发规范

### 4.1 模块边界

- 认证、系统管理、监控、工具按当前目录边界继续扩展
- 模块内部优先拆成 `controller / service / dto`
- 公共导出、上传、拦截器、鉴权逻辑统一放 `common` 和 `auth`

### 4.2 响应规范

- 继续保持若依风格 `code / msg / data / rows / total`
- 导出接口返回真实文件流
- 上传接口返回前端可直接消费的路径
- 错误消息必须保持可读中文

### 4.3 写接口要求

- 真实数据路径和回退路径都要能完成同样的业务动作
- 对树结构写入要同步处理 `parentId / ancestors / 子树清理`
- 对关联数据写入要同步处理关系表清理与重建

### 4.4 审计与监控

- 新增高价值写接口时，需要考虑是否纳入操作日志语义
- 新增可导出列表时，导出必须与分页查询保持字段一致
- 新增文件上传时，必须兼容开发代理和局域网访问场景

## 5. 注释规范

### 5.1 允许加注释的场景

- 共享组件里的状态推导不直观
- 若依协议兼容、旧路径兼容、hidden 节点提升等非显而易见逻辑
- 数据库优先 / mock 回退策略
- 滚动策略、拦截器策略、导出策略等容易回归的地方

### 5.2 禁止加注释的场景

- “给变量赋值”
- “调用接口获取数据”
- 任何从代码本身一眼能看出来的注释

### 5.3 注释风格

- 使用一句话说明“为什么这样做”，而不是“这段代码做了什么”
- 注释优先放在共享能力和适配层
- 页面级注释保持极少，避免噪音

## 6. 新需求接入流程

1. 明确该需求是页面私有，还是可复用能力
2. 检查现有共享组件、工具、状态层能否承接
3. 如果不能承接，再以扩展点方式增强共享层
4. 最后才允许页面内增加私有逻辑
5. 落地后补文档和必要注释

## 7. 联调变更要求

涉及前后端联调的改动，至少要确认：

- 前端 `pnpm build` 通过
- 后端 `pnpm --filter @ruoyi-modern/server build` 通过
- 用户可见消息无乱码
- 若依兼容路由和按钮权限未被破坏

## 8. 推荐重点维护文件

前端：

- `src/components/admin/AdminDataTable.vue`
- `src/components/admin/AdminDialogContent.vue`
- `src/stores/navigation.ts`
- `src/router/backend-route-map.ts`
- `src/utils/request.ts`

后端：

- `apps/server/src/auth/auth.service.ts`
- `apps/server/src/common/interceptors/operlog.interceptor.ts`
- `apps/server/src/tool/gen/gen.service.ts`
- `apps/server/src/common/upload/upload.service.ts`

## 9. 结论

后续开发的目标不是继续堆页面，而是在保持当前协议和结构稳定的前提下，持续降低重复实现和回归风险。