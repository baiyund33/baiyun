# baiyun

基于 Go / go-zero 的学习版 IM，包含用户、社交、WebSocket 服务与 React 前端。

## 本地准备

仓库只提交各服务 `etc/*.example.yaml` 配置示例。将其复制为同目录去掉 `.example` 的文件，例如：

```powershell
Copy-Item apps/user/rpc/etc/user.example.yaml apps/user/rpc/etc/user.yaml
```

已有本地配置时不要覆盖。其余服务按同样方式准备配置，再填写数据库、Redis、etcd地址及凭据。用户 API、社交 API和 WebSocket 的JWT密钥必须一致，示例占位值不能用于部署。实际配置已被Git忽略，仍需单独提供给服务器；Compose挂载原来的配置路径。

```powershell
go mod download
cd web
npm ci
npm run dev
```

后端启动与组件准备见 [部署索引](docs/deploy/README.md)，当前功能与限制见 [开发索引](docs/development/README.md)，会话进度见 [交接记录](docs/tasks/HANDOFF.md)。

## 仓库整理说明

`node_modules`、本机配置、测试结果及Obsidian工作区状态不再纳入版本管理，本机文件保留。历史提交曾包含运行凭据；从当前版本移除不会清除历史，使用者应更换曾提交的数据库密码、Redis密码与JWT密钥。本次未强制改写远端历史。
