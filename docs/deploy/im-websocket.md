# IM WebSocket 本地运行

更新：2026-10-11，待构建/连接验证，尚无服务器Docker/Compose部署。

运行状态更新：用户已自行启动WS8890（本轮PID30888），代理未重启；用户授权后代理启动全部user/social RPC与API，8080/8081/8888/8889均监听，实际用户API→RPC Ping200、social无令牌401。日志与清单在C:\Users\29417\AppData\Local\Temp\baiyun-runtime-20261011-061840，新RPC/API进程NO_PROXY=*，配置不变。WS登录回显仍未确认；下方“代理未启动WS”不代表当前WS未运行。

## 作用与配置

`apps/im/ws` 提供GET /ws，验证JWT后升级并回显消息，不存储或转发。入口im.go、配置etc/im.yaml，Name im、Host0.0.0.0、Port8890；Auth.AccessSecret与用户API相同，仅在本地配置，不输出令牌或密钥。AllowedOrigins当前仅http://localhost:3000，浏览器使用其他地址会被拒绝；更改来源时同步配置。

当前环境Windows PowerShell、根Go模块go1.26.7；go.mod使用go-zero1.10.3、JWTv4.5.2、gorilla/websocket v1.5.4-0.20250319132907-e064f32e3674。具体安装以本机为准。WebSocket库无需独立容器，也不依赖MongoDB。

## 构建与启动

根目录E:\code\baiyun，用户执行：

```powershell
go build ./apps/im/ws/...
go run ./apps/im/ws -f apps/im/ws/etc/im.yaml
```

预期监听8890，尚未实测。WebSocket直接连接ws://localhost:8890/ws；持有有效登录令牌即可握手，若需登录则依赖user API/RPC及其已有中间件，见 [用户服务](user-docker.md)。前端开发在web目录npm run dev，登录页面http://localhost:3000。当前Vite未代理/ws，测试直接连8890。

## 验证与排错

浏览器从登录会话读取JWT，以子协议数组['baiyun',accessToken]连接，预期101和baiyun协议；发送文本应收到同文，随后close1000。不使用地址查询参数传JWT，不输出JWT。缺令牌/过期/签名错误401，来源不在白名单403。若200，核对实际运行的wsConnectHandler是否包含Upgrade；端口冲突可用Get-NetTCPConnection -LocalPort 8890 -State Listen定位，不能批量停止无关Go进程。前台日志查看启动终端，Ctrl+C停止服务，重新执行启动命令重启。

实测状态：代理仅核对配置和代码，密钥配置与用户API比较一致（未输出），未构建/启动/发握手。代码限制消息64KiB、读取空闲60秒、写入10秒、握手5秒，升级后不再输出HTTP正文。

## 数据与后续部署

当前无消息落盘或数据卷，停止后连接消失；没有数据库迁移/备份操作。Ubuntu/Compose和反向代理wss部署待功能验证后补齐，不能使用尚不存在的服务名执行部署命令。JWT只在握手时校验，心跳/在线管理/转发和连接到期策略待开发。详见 [开发记录](../development/im-websocket.md)。
