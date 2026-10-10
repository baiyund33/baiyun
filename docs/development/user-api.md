# 用户 API 调用 RPC

状态：代码已接入，HTTP 成功调用待验证。

## 目标和参考

提供 POST `/api/user/ping`，接收 name，调用用户 RPC，返回 message。参考项目的 `apps/user/api/user.api`、`internal/config/config.go` 和 `internal/svc/servicecontext.go`：沿用 API 定义、RPC 客户端配置及依赖初始化方式。本项目暂用 Ping 打通调用链，尚未实现参考项目的注册、登录或鉴权。

## 文件和流程

- `apps/user/api/user.api`：HTTP 协议，包含 info、PingReq、PingResp 和路由。
- `internal/handler/routes.go`、`pinghandler.go`：生成的路由和请求解析。
- `internal/config/config.go`：RestConf 和 UserRpc 配置。
- `etc/user.yaml`：API 8888 端口、云端 etcd 服务发现。
- `internal/svc/servicecontext.go`：通过 zrpc.MustNewClient 和 userclient.NewUser 创建 UserRpc。
- `internal/logic/pinglogic.go`：调用 UserRpc.Ping，传递 Name；错误向上返回，成功映射 Message。

调用链：HTTP → pingHandler → API PingLogic.Ping → userclient.defaultUser.Ping → gRPC → RPC UserServer.Ping → RPC PingLogic.Ping → HTTP 响应。etcd 提供 RPC 地址，不转发业务请求。

## 生成和验证

在项目根目录的 PowerShell 使用 `goctl api go -api apps/user/api/user.api -dir apps/user/api`，当前骨架注释显示版本 1.10.2。代码实际存在，代理未重新生成。

由用户构建：`go build ./apps/user/api/...`。前置条件为 RPC 运行及其 Redis、etcd 可用；MySQL 初始化对象并不代表已成功查询。

API 启动：`go run ./apps/user/api -f apps/user/api/etc/user.yaml`。POST `http://127.0.0.1:8888/api/user/ping`，JSON 请求 `{"name":"baiyun"}`，预期 HTTP 200、响应 `{"message":"hello, baiyun"}`。2026-10-02 用户确认服务器部署后的 Postman Ping 测试通过；未提供原始响应，代理未独立连接服务器实测。此前 503 为历史问题。

## 已发现的问题和后续

- PingResp 和 RPC PingResponse 的响应字段为 Message，不能使用 Name。
- 新引入 REST 后缺少 JWT go.sum 记录，已指导 go mod tidy，当前记录存在；这不代表启用了登录校验。
- HTTPS_PROXY 指向 7890 时 RPC 可能走代理。临时联调在 API 的 PowerShell 中设置 `$env:NO_PROXY="*"` 后重启；设置仅影响当前终端及后续子进程。固定排除列表需要包含实际 RPC 地址。
- Endpoints 比 Etcd 优先。本项目 Endpoints 已注释，采用云端 etcd。

后续：用户表读写及创建、更新、删除代码已存在，继续核实服务器 CRUD 正常/异常流程和数据变化。缓存业务及登录认证仍待开发；本篇主要说明 Ping 调用链。
