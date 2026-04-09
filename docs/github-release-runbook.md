# GitHub 发布操作手册

本文档用于在 GitHub 上完成最后的仓库发布动作，按顺序执行即可。

## 1. 代码准备

先确保本地工作区处于可发布状态：

```bash
pnpm build
pnpm server:build
pnpm server:seed -- --check
```

建议同时确认：

- README 截图可见
- 文档入口正常
- 默认账号与初始化命令已更新
- 没有误提交 `.env`、数据库连接串和上传产物

## 2. 推送主分支

将当前最终版本推送到 GitHub 主分支。

建议在 GitHub 页面确认：

- 最新提交已同步
- CI 已通过
- 仓库首页 README 正常渲染

## 3. 设置仓库 About

进入仓库首页右侧 About 区域，按以下内容填写：

- Description：参考 [GitHub 仓库信息速查](./github-publishing-snippets.md)
- Website：如有在线演示地址则填写，没有可留空
- Topics：参考 [GitHub 仓库信息速查](./github-publishing-snippets.md)

## 4. 设置 Social Preview

在仓库设置中上传社交预览图。

建议使用：

- `docs/screenshots/dashboard.png`

## 5. 创建首个 Release

建议版本号：

- `v1.0.0`

建议标题：

- `v1.0.0 · First public release`

Release 正文可直接复制：

- [GitHub Release 正文（v1.0.0）](./github-release-body-v1.0.0.md)

## 6. Release 页面建议检查项

创建 Release 前，建议确认：

- Tag 名称正确
- Target 分支正确
- Release 标题正确
- Release 正文已粘贴
- README 中提到的文档文件都存在
- License、Contributing、Security、Code of Conduct 可从仓库首页进入

## 7. 发布后回归

Release 发布后建议再做一次快速回归：

- 打开仓库首页
- 打开 README 中的截图
- 打开 `LICENSE`
- 打开 `CONTRIBUTING.md`
- 打开 `SECURITY.md`
- 打开 `CODE_OF_CONDUCT.md`
- 打开 `docs/release-notes-v1.0.0.md`

## 8. 可选增强

如果你希望仓库更完整，还可以继续补：

- `CHANGELOG.md`
- 示例演示地址
- GitHub Pages 或文档站点
- 版本徽章
- Docker 镜像发布流程

## 9. 结论

当 About、Topics、Social Preview、Release Notes 和首个 Tag 都完成后，这个仓库就已经具备正式公开发布条件。