<div align="center">

# RuoYi Modern Admin

基于 **Vue 3 + TypeScript + shadcn-vue + Tailwind CSS v4** 重构的若依后台前端。  
保留 **RuoYi-Vue3** 的管理工作流、接口语义和信息架构，同时用更现代的组件体系、主题系统和交互细节重做后台体验。

<p>
  <img alt="Vue 3" src="https://img.shields.io/badge/Vue-3-42b883?logo=vuedotjs&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white">
  <img alt="Tailwind CSS v4" src="https://img.shields.io/badge/Tailwind_CSS-v4-06b6d4?logo=tailwindcss&logoColor=white">
  <img alt="shadcn-vue" src="https://img.shields.io/badge/shadcn--vue-UI-111827">
  <img alt="RuoYi Compatible" src="https://img.shields.io/badge/RuoYi-Vue3_Compatible-16a34a">
  <img alt="License" src="https://img.shields.io/badge/License-Apache_2.0-D22128?logo=apache&logoColor=white">
</p>

<p>
  <strong>不是简单换皮，而是一次面向现代后台体验的重构。</strong>
</p>

</div>

---

## 项目预览

| 工作台 | 用户管理 |
| --- | --- |
| ![工作台](./docs/screenshots/dashboard.png) | ![用户管理](./docs/screenshots/user-management.png) |

## 项目定位

这个项目的目标很明确：

- 保留若依后台熟悉的模块结构、权限模型、CRUD 工作流和后端接口语义。
- 用 `shadcn-vue + Tailwind CSS v4` 替换传统 UI 体系，建立更现代的视觉与组件基础。
- 提供一套可继续二次开发、可接真实若依后端、可落地的后台前端工程。

它适合这几类场景：

- 想继续使用若依后端，但不想沿用原有前端视觉体系。
- 想要一套更轻、更可控、更现代的 Vue 3 管理后台基础工程。
- 想把若依项目迁移到 `Tailwind + shadcn-vue` 体系，减少后续样式和组件维护成本。

## 项目亮点

- 完整接入若依登录、菜单、权限、`/getInfo`、`/getRouters` 与主要系统接口。
- 核心页面已经改成真实业务页，不再依赖统一配置渲染器。
- 保留若依常见后台工作流：查询、分页、树表、弹窗、分配、导出、日志、监控、代码生成。
- 主题系统可切换明暗模式、主题色、圆角、布局模式，并支持持久化。
- 标签页、右键菜单、刷新当前页、旧路径兼容、隐藏业务页路由都已经打通。
- 表格、查询区、弹窗、操作栏、日期选择、富文本、头像裁剪等通用能力都已经抽成共享组件。
- 移动端做过专门收口，不只是“桌面布局缩放”。

## 已覆盖模块

### 系统管理

- 用户管理
- 角色管理
- 菜单管理
- 部门管理
- 岗位管理
- 字典管理 / 字典数据
- 参数设置
- 通知公告
- 个人中心
- 分配角色 / 分配用户

### 系统监控

- 在线用户
- 登录日志
- 操作日志
- 定时任务
- 调度日志
- 服务监控
- 缓存监控
- 缓存列表
- Druid

### 系统工具

- 代码生成
- 代码生成编辑
- Swagger
- 表单构建

### 其他能力

- 登录 / 注册 / 锁屏 / 401 / 404
- 公告中心
- 顶部 TagsView
- 动态主题与布局设置
- 头像裁剪上传
- 富文本编辑器

## 与原版若依的关系

这个项目是 **“业务语义与后端接口兼容优先”** 的现代化重构，不是逐像素复刻。

已经尽量保持一致的部分：

- 模块划分
- 路由语义
- 权限模型
- 常见页面交互链路
- 后端接口调用方式
- 旧路径兼容与隐藏页访问方式

刻意做了现代化调整的部分：

- 视觉风格
- 主题系统
- 弹窗、标签页、卡片、查询区和操作栏交互
- 组件抽象方式
- 表单构建页

## 技术栈

- Vue 3
- TypeScript
- Vite 6
- Pinia
- Vue Router
- Tailwind CSS v4
- shadcn-vue
- Reka UI
- TanStack Vue Table
- Tiptap
- vue-cropper
- vue-sonner
- ECharts / vue-echarts

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动开发环境

```bash
pnpm dev
```

### 3. 构建生产版本

```bash
pnpm build
```

## 后端接入

开发环境默认通过 Vite 代理将 `/dev-api` 转发到若依后端。

在 [`.env.development`](./.env.development) 中修改代理地址：

```env
VITE_APP_DEV_PROXY_TARGET=http://localhost:8080
```

如果你的若依后端地址不是本地 `8080`，只需要改这里。

## 常用命令

```bash
pnpm dev      # 本地开发
pnpm build    # 生产构建
pnpm preview  # 本地预览构建结果
```

## 目录结构

```text
src
├─ api                 # 若依接口模块
├─ components
│  ├─ admin            # 后台业务通用组件
│  ├─ app              # 应用壳层组件
│  └─ ui               # shadcn-vue / 基础 UI 组件
├─ layout              # 后台布局
├─ lib                 # 权限、树结构、下载、构建器等通用逻辑
├─ router              # 静态路由与后端 component 映射
├─ stores              # Pinia 状态
├─ theme               # 主题预设与主题应用
├─ utils               # 请求、鉴权等工具
└─ views               # 真实业务页面
```

## 当前工程特性

### 1. 动态路由与菜单

- 菜单树以若依后端返回的 `/getRouters` 为主。
- 前端只保留少量必要的本地独立路由。
- 兼容若依常见旧路径、隐藏页和后端 `component` 字符串变体。

### 2. 权限模型

- 支持页面级权限和按钮级权限。
- 手输 URL 的访问边界做了守卫收口。
- 嵌入页和只读页也有对应权限提示。

### 3. 主题与布局

- 支持明暗模式
- 支持主题色切换
- 支持圆角半径切换
- 支持 `TopNav / TagsView / 固定 Header / Logo / 动态标题 / 底部版权`
- 布局与主题设置会本地持久化

### 4. 共享组件体系

当前已抽象的后台能力包括：

- 统一表格与操作栏
- 统一查询区
- 统一卡片壳
- 统一弹窗壳
- 统一日期选择 / 日期范围选择
- 富文本编辑器
- 头像裁剪上传
- 树列表 / 树表交互
- 自定义滚动条

## 当前差异与边界

以下部分仍然与原版若依存在差异，这是有意保留的边界：

- `tool/build` 是增强版本地表单设计工作台，不是原版若依 1:1 同构实现。
- `Druid` 与 `Swagger` 目前仍然是嵌入式页面。
- 视觉上保留了现代化主题，不是原版 Element 风格复刻。
- 仓库中的 [`_references`](./_references) 和 [`_scaffold`](./_scaffold) 仅作为历史参考，不参与运行。

## 建议验收路径

1. 登录 / 注册 / 退出登录 / 锁屏 / 401 / 404
2. 动态菜单、标签页、面包屑、旧路径直达
3. 用户、角色、菜单、部门、岗位、字典、参数、公告 CRUD
4. 在线用户、登录日志、操作日志、定时任务、服务监控、缓存监控
5. 主题切换、布局设置、移动端适配
6. 代码生成、Swagger、Druid、表单构建

## 路线图

- [x] 接入真实若依登录、权限、菜单和核心 CRUD 接口
- [x] 完成现代化主题系统与布局系统
- [x] 完成表格、查询区、弹窗、操作栏等共享抽象
- [x] 接入富文本编辑器与头像裁剪上传
- [x] 收口主要页面的移动端适配
- [ ] 继续补少量边角页面和深度联调差异
- [ ] 根据实际开源反馈继续完善文档、示例和演示素材

## 开源协议

本项目使用 [Apache License 2.0](./LICENSE) 开源发布。

## 鸣谢

- [RuoYi-Vue3](https://github.com/yangzongzhuan/RuoYi-Vue3)
- [shadcn-vue](https://github.com/unovue/shadcn-vue)
- [Tailwind CSS](https://tailwindcss.com/)
- [Reka UI](https://reka-ui.com/)
- [Tiptap](https://tiptap.dev/)
- [vue-cropper](https://github.com/xyxiao001/vue-cropper)

---





