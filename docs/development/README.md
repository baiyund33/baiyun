# 学习与开发文档

当前直接开发 go-zero 用户服务：先理解正式 `user.proto`，再通过 goctl 生成并实现 RPC，之后补 HTTP API。

| 顺序 | 文档 | 状态 |
| --- | --- | --- |
| 00 | [day01 基础命令](<baiyun/day01 基础命令.md>) | 已补充 go mod init；现有模块名为 baiyun |
| 01 | [proto 与原生 gRPC 教程](01-proto-grpc.md) | 早期学习资料；其中 `examples/grpc-ping` 路线已停用，不作为本项目开发步骤 |
| 02 | [用户 RPC 服务骨架](user-rpc.md) | 骨架和 Ping 逻辑已存在；最终成功调用待确认 |
| 03 | [用户 API 调用 RPC](user-api.md) | API 骨架和调用代码已存在；HTTP 联调待验证 |
| 04 | [用户注册与登录](user-auth.md) | 注册登录、JWT 签发和本人权限代码已存在；完整运行验证待确认 |
| 06 | [JWT 与请求 context](<baiyun/day09 JWT与请求context.md>) | 初学者说明，已核对实际中间件与 context 传递；运行验证待确认 |
| 05 | [Web 前端用户认证与桌面界面](web-auth.md) | 桌面布局、申请处理、好友/通知无限滚动与已加载好友过滤已接入；构建和模拟浏览器检查通过，真实联调待验证 |
| 07 | [单向删除好友与重新申请](social-friend-delete.md) | 前后端已接入，Go回归测试/构建及模拟UI通过，本机前后端已运行；真实数据库删除重加待验证 |
| 08 | [IM WebSocket服务](im-websocket.md) | JWT/来源检查/升级/回显代码已有，8890；构建与真实连接待验证 |

教程中的代码块是待练习示例，不表示仓库已实现相应服务。实际开发后，应在对应文档补充文件位置、使用版本和实测结果。

进度入口：[会话交接](../tasks/HANDOFF.md) · [总任务](../tasks/ROADMAP.md)。

Dockerfile 的构建原理、参考差异及运行验证见 [用户服务 Docker 部署](../deploy/user-docker.md)。文件已准备，镜像和服务器部署待验证。

- [好友申请](social-friend.md)：Model 和 RPC 骨架已存在，配置接入待修正，业务待实现与验证。



