# IM WebSocket 服务

更新：2026-10-11。状态：JWT鉴权、来源白名单、连接升级与原样回显代码已存在；静态核对通过，尚未构建/真实握手，没有好友转发、心跳或存储。下方10-09记录保留为历史进展。

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
