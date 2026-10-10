# 用户 RPC：服务骨架

状态：用户已编写 `Ping` 返回逻辑，尚未完成本次代码的构建与调用验证。

- 协议：`apps/user/rpc/user.proto` 定义 `User.Ping`。
- 生成命令（在项目根目录）：`goctl rpc protoc apps/user/rpc/user.proto --go_out=apps/user/rpc --go-grpc_out=apps/user/rpc --zrpc_out=apps/user/rpc --name-from-filename`。
- `go_package = "./user"` 表示将 pb 文件生成在本 RPC 服务目录的 `user` 子目录；项目的 Go 导入路径为 `baiyun/apps/user/rpc/user`。
- `user/*.pb.go` 是消息和 gRPC 接口；`internal/server` 接收请求并调用 `internal/logic`；`internal/svc` 保存服务依赖；`etc` 存放配置；`userclient` 是 go-zero 客户端封装；`user.go` 是入口。
- 计划调用链：客户端调用 `user.NewUserClient(conn).Ping` → `internal/server.UserServer.Ping` → `internal/logic.PingLogic.Ping` → 返回 `PingResponse`。
- `internal/logic/pinglogic.go` 当前读取 `in.GetName()` 并返回 `"hello, " + name`；尚未处理空名字。
- 本次生成使用 goctl 1.10.2。`go.mod` 已通过 `go mod tidy` 添加实际依赖。
- `etc/user.yaml` 当前监听 `0.0.0.0:8080`，用户已将 etcd 地址改为远程主机。2026-09-30 启动时连接该 etcd 超时，服务随即退出，尚未完成 Ping 调用验证。若先做本机直连测试，可由用户移除整个 `Etcd` 段并把监听地址改为 `127.0.0.1:8080`；若保留 etcd，则需先确认远程服务可达及地址、端口、认证配置。
- 生成骨架后曾完成 `go build ./apps/user/rpc/...`。当前用户编写的 Ping 版本尚未构建或调用验证。检查时 etcd 的 `127.0.0.1:2379` 不可达，`8080` 端口空闲；若只做本机直连测试，需由用户先调整 `etc/user.yaml`，去掉 `Etcd` 配置并将监听地址限制在本机。
- `--name-from-filename` 只改变 goctl 生成的服务名与文件名，不改变 proto 的 `package baiyun.user` 或 gRPC 方法全名 `/baiyun.user.User/Ping`。
- 参考项目文件：`apps/user/exec.sh`、`apps/user/rpc/user.proto`、`apps/user/rpc/internal/server/userserver.go`、`apps/user/rpc/internal/logic/pinglogic.go`。本项目使用 `./user` 的 go_package 以匹配 goctl 的输出根目录。

下一步：用户调整本机测试配置，然后运行构建和服务启动命令；代理只提供指导与审阅。生成文件不手动修改。
