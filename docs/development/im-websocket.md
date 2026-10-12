# IM WebSocket 服务

更新：2026-10-11。状态：JWT鉴权、来源白名单、连接升级、回显与心跳已通过最新代码独立服务测试；超限关闭code1006待完善。没有好友转发或存储。下方准备步骤与早期测试记录保留为历史进展。

## 2026-10-12 提交前核对

用户已在读取超时分支尽力发送1001关闭帧，并创建 `internal/connection/manager.go`：Manager包含RWMutex与用户多连接集合，NewManager初始化外层map。注册/移除/查询方法及安全发送尚未实现，也未接入ServiceContext，不能视为在线管理已完成。连接管理借鉴参考 `easy-im-master/go-im/apps/im/ws/websocket/server.go` 的索引和锁；本项目允许多个页面连接，参考实现则替换同用户旧连接。

本轮 `go build ./apps/im/ws/...`、gofmt格式检查、`go test ./apps/social/rpc/internal/logic/...`、前端TypeScript无输出类型检查和 `node --check web/tests/websocket.e2e.cjs` 均通过。本轮未重跑70秒浏览器测试，新超时分支尚无运行验证；14项报告对应前一轮心跳代码。测试结果目录只保留本地，脚本纳入仓库。

运行配置已停止跟踪，仓库提交 `etc/*.example.yaml`；本机原文件保留，首次拉取需复制示例并填写实际配置，参见 [项目准备](../../README.md)。历史凭据需更换，不因移除当前配置而自动失效。

## 最新心跳验证（2026-10-11）

用户修改 `apps/im/ws/internal/handler/wsconnecthandler.go`：每20秒后台发送协议Ping，收到Pong延长60秒读取期限，handler退出时关闭done通知并停止ticker。保持一个读取者和一个普通消息写入者；WriteControl允许并发发送控制帧。参考 `easy-im-master/go-im/apps/im/ws/websocket/server.go` 的连接退出通知与帧处理；本项目采用gorilla标准Ping/Pong，暂不搬入参考的业务帧/ACK架构。

代理验证构建成功，`gofmt -l apps/im/ws/internal/handler/wsconnecthandler.go` 无输出。构建命令为 `& 'C:\Program Files\Go\bin\go.exe' build -o <临时目录>/im-test.exe ./apps/im/ws`。使用独立配置、测试专用签名密钥和127.0.0.1:10412运行最新程序，不修改项目YAML、真实账号或数据库，不重启原8890。验证后已停止临时服务。

Playwright脚本更新为14项检查，实际正常浏览器无业务消息70017ms后仍可回显并正常关闭1000；不回应Pong的原始TCP客户端收到3次Ping后60002ms关闭。鉴权拒绝、来源拒绝、限额、并发与重连回归通过。消息超限仍关闭1006、wasClean=false，不能认为关闭握手已完善。结果见 `web/tests/results/websocket-results.json`；测试使用临时身份，不代表真实登录流程测试。

独立服务复测可设置以下环境变量，再执行上面的脚本命令；测试密钥必须与独立配置匹配，不能替换正常服务密钥：

```powershell
$env:BAIYUN_WS_URL = 'ws://127.0.0.1:10412/ws'
$env:BAIYUN_WS_TEST_SECRET = '<独立测试配置的密钥>'
node web/tests/websocket.e2e.cjs
```

正常服务复测时删除这两个测试环境变量，脚本默认使用8890与本地配置。需要先重启旧进程才能加载用户新写的心跳代码。下一步完善关闭帧，再接在线连接管理与好友消息转发。

## Playwright真实WebSocket测试（2026-10-11）

用户授权测试，新增 `web/tests/websocket.e2e.cjs`，使用环境已有Playwright和本机Edge，不新增npm依赖。实际访问localhost:3000页面，并连接本机8890服务；HTTP401/403通过Playwright请求API确认。临时JWT从本地WS密钥在内存中签发，使用测试身份，不登录真实账号、不注册、不写数据库、不输出或保存密钥/JWT。结果证明握手/回显行为，不代表真实账号登录界面已验证。

根目录实际执行：

```powershell
$env:BAIYUN_PLAYWRIGHT_MODULE = 'C:\Users\29417\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright'
node web/tests/websocket.e2e.cjs
```

13项功能检查通过：有效JWT/baiyun协议/连续中文消息回显/主动close1000；无令牌、错误签名、过期、缺exp、非法userId、非HS256、错误应用协议均401；127.0.0.1页面来源403；大于64KiB消息不回显并断开；并发连接分别回显；空闲60016ms断开；断开后重连成功。JSON报告 `web/tests/results/websocket-results.json` 不含凭据，可重复运行覆盖。

待完善：超限及空闲均code1006、wasClean=false，未完成正常关闭握手。首次测试要求超限必须1009而失败，后续分开“限制生效”和“关闭码完善”，允许1006/1009判断限制并记录异常码；最终功能通过不代表关闭处理无问题。本轮未修改后端或重启服务。下一步完善关闭帧和心跳，真实账户登录及好友转发仍未测试。

## 2026-10-11 最小回显验证准备

实际wsConnectHandler先authenticateWS、失败401 JSON，成功把字符串userId放入派生context调用原WsConnectLogic（当前空逻辑），然后Upgrade。Upgrader只选择baiyun子协议、CheckOrigin匹配AllowedOrigins、握手5秒；连接ReadMessage/WriteMessage串行回显文本或二进制，64KiB消息限制、每次读取60秒空闲超时、写10秒超时、退出Close。升级后不再调用httpx.Ok/Error。协议收发在handler，好友业务之后再入logic。参考server.go的Upgrade/连接管理设计，未复制放行全部来源的CheckOrigin。

验证步骤由用户执行，根目录 `go build ./apps/im/ws/...`，之后 `go run ./apps/im/ws -f apps/im/ws/etc/im.yaml`。前端使用http://localhost:3000登录，浏览器控制台从baiyun_user_session读取accessToken（不要输出），调用new WebSocket('ws://localhost:8890/ws',['baiyun',accessToken])。onopen发送文本，onmessage核对原文并正常close1000。预期HTTP101且ws.protocol为baiyun；401检查登录/密钥/exp，403检查Origin白名单，普通200表示运行旧代码或路由未升级。代理未执行构建/启动/请求，不将预期作为实测。

不需要social服务即可完成已有登录令牌的回显验证；若需要重新登录则启动用户API及其RPC，前端依然可能因为未启动social服务显示好友列表错误，这与WS回显不同。当前只验证握手时JWT，连接后不自动按exp断开，idle超时不等于心跳；后续再补连接生命周期与心跳。部署与配置见 [WS运行说明](../deploy/im-websocket.md)。

鉴权辅助函数进展：`internal/handler/wsauth.go` 已由用户实现authenticateWS(r,secret)，静态核对通过：websocket.Subprotocols读取baiyun/JWT两项，jwt.Parse限定HS256验证签名、显式VerifyExpiresAt要求有效exp，userId字符串转正int64。成功返回userID,nil，失败0,error。不查询用户数据库或承担连接升级。wsConnectHandler当前仍未调用它，因此“辅助函数已实现”不等于“/ws已启用鉴权”，尚无真实握手验证。后续需在Upgrade之前调用并处理HTTP401，校验AllowedOrigins，协商协议只选择baiyun，不回显JWT。

最新核对：用户已将handler名改为wsConnect以避开IDE对connect关键字的解析提示，并生成wsconnecthandler.go；端口已改8890，先前冲突已消除。Auth与来源配置仍未加入，下一步在Config/YAML增加Auth.AccessSecret与AllowedOrigins；此为待实现指导，不描述为已鉴权。旧connecthandler.go仍保留但不再注册路由，下方初次核对描述作为历史记录。

## 目标与参考

通过GET /ws握手建立实时连接，后续逐步接JWT、连接清理、心跳及单聊。已读参考 `easy-im-master/go-im/apps/im/ws/im.go`、`internal/handler/router.go`、`auth.go`：参考自定义websocket.Server提供鉴权和消息路由。本项目先按AGENTS约定由.api生成HTTP骨架，再在协议处理层实现升级；不提前搬入配置中心/ACK/MongoDB。

## 当前文件与流程

- `apps/im/ws/im.api`：service im、connect handler、GET /ws。
- `im.go`：conf.MustLoad→NewServiceContext→RegisterHandlers→rest.Server.Start。
- `internal/handler/routes.go`：生成的HTTP GET /ws注册，不直接编辑。
- `internal/handler/connecthandler.go`：当前调用NewConnectLogic(r.Context(),svcCtx).Connect，成功httpx.Ok；未来此处负责HTTP升级，升级后不能再写普通HTTP响应。
- `internal/logic/connectlogic.go`：当前仅返回nil，并未实现聊天业务。
- `internal/config/config.go` / `internal/svc/servicecontext.go`：仅RestConf和Config，没有JWT、RPC或数据库依赖。
- `etc/im.yaml`：当前Name im、Host0.0.0.0、Port8888。端口与user API冲突，应用户先改8890。

用户已生成骨架，生成文件标注goctl1.10.2；代理未执行生成。HTTP200不表示WebSocket成功，真正升级须返回101并能持续收发。目前无登录身份处理，不应描述为可用聊天入口。

## 下一步与验证

先由用户将Port改8890，再接握手鉴权和升级。后续根目录适用命令：`go build ./apps/im/ws/...`；运行`go run ./apps/im/ws -f apps/im/ws/etc/im.yaml`。本轮没有执行这些命令，也没有启动新服务，尚无实际请求结果。

现阶段未引入新的独立组件，不需要MongoDB部署。当前没有生产部署文件；完成连接后再同步部署流程和真实端口。初步消息暂不持久化，存储与历史查询阶段再接MongoDB。对浏览器不能自定义普通WebSocket Authorization头的限制，后续须在握手鉴权设计中具体解决，不能仅加JWT路由就宣称浏览器可连接。
