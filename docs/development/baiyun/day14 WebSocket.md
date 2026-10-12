#### 1.创建 **WebSocket 服务骨架**

在 `E:\code\baiyun` 执行：

```
New-Item -ItemType Directory -Force apps/im/ws
```

创建 [im.api](E:/code/baiyun/apps/im/ws/im.api)，填写：

```
syntax = "v1"

info (
    title: "即时聊天服务"
    desc: "提供 WebSocket 连接入口"
)

service im {
    @handler connect
    get /ws
}
```

然后生成：

```
goctl api go -api apps/im/ws/im.api -dir apps/im/ws
```

这一步生成的是 **HTTP 服务骨架**。WebSocket 先通过 HTTP 发起连接，下一步再为 `/ws` 加入身份验证和连接升级。

#### 2.添加 **JWT 密钥和浏览器来源配置**。

修改 [config.go](E:/code/baiyun/apps/im/ws/internal/config/config.go)：

```go
type Config struct {
	rest.RestConf

	Auth struct {
		AccessSecret string
	}

	AllowedOrigins []string
}
```

在 [im.yaml](E:/code/baiyun/apps/im/ws/etc/im.yaml) 中补充：

```yaml
Auth:
  AccessSecret: "<填写用户 API 中相同的 AccessSecret>"

AllowedOrigins:
  - "http://localhost:3000"
```

- `AccessSecret`：验证登录接口签发的 JWT。
- `AllowedOrigins`：限制哪些浏览器页面可以连接。


#### 3.安装 WebSocket 库，在 `E:\code\baiyun` 执行：

```
go get github.com/gorilla/websocket
```

#### 4.实现**验证 JWT、获取用户 ID**。

在handler目录下创建 [wsauth.go](E:/code/baiyun/apps/im/ws/internal/handler/wsauth.go)：

```go
package handler

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"github.com/gorilla/websocket"
)
//secret：JWT签名密钥
func authenticateWS(r *http.Request, secret string) (int64, error) {
	// 浏览器通过子协议传入两项：baiyun、登录令牌。
	//[]string{"baiyun", "<登录JWT>"}
	protocols := websocket.Subprotocols(r)
	if len(protocols) != 2 || protocols[0] != "baiyun" {
		return 0, errors.New("请先登录")
	}

	// 验证签名，限定使用登录接口相同的 HS256 算法。
	token, err := jwt.Parse(
		protocols[1],
		func(token *jwt.Token) (any, error) {
			return []byte(secret), nil
		},
		jwt.WithValidMethods([]string{"HS256"}),
	)
	if err != nil || !token.Valid {
		return 0, errors.New("登录令牌无效或已过期")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !claims.VerifyExpiresAt(time.Now().Unix(), true) {
		return 0, errors.New("登录令牌无效或已过期")
	}

	// 登录接口将 userId 写成字符串，这里取出并转换。
	userIDText, ok := claims["userId"].(string)
	if !ok {
		return 0, errors.New("登录身份无效")
	}

	userID, err := strconv.ParseInt(userIDText, 10, 64)
	if err != nil || userID <= 0 {
		return 0, errors.New("登录身份无效")
	}

	return userID, nil
}
```

浏览器普通 WebSocket 无法直接设置 `Authorization` 请求头，因此这里约定通过**子协议参数**携带 JWT，服务端后续只选择 `baiyun`，不回显令牌。


把 WebSocket 服务端想成一个**聊天室管理员**：

- 浏览器：来聊天的人。
- JWT：登录后拿到的通行证。
- `wsauth.go`：检查通行证的人。

浏览器想连接时，服务端调用它：

> “这张通行证是真的吗？过期了吗？属于谁？”

检查通过后，它告诉服务端：

> “这个人是用户16。”

服务端就能记住：**这条连接属于用户16**。以后从这条连接收到消息，就知道是谁发的。

所以，`wsauth.go` **由服务端调用，浏览器只负责带上通行证**。

#### 5.鉴权**实际生效**。将 wsconnecthandler.go替换为：

```go
package handler

import (
	"context"
	"net/http"
	"strconv"

	"baiyun/apps/im/ws/internal/logic"
	"baiyun/apps/im/ws/internal/svc"

	"github.com/zeromicro/go-zero/rest/httpx"
)

func wsConnectHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 建立连接前验证登录身份。
		userID, err := authenticateWS(
			r,
			svcCtx.Config.Auth.AccessSecret,
		)
		if err != nil {
			httpx.WriteJson(w, http.StatusUnauthorized, map[string]string{
				"message": err.Error(),
			})
			return
		}

		// 将已验证的身份交给后续业务逻辑。
		ctx := context.WithValue(
			r.Context(),
			"userId",
			strconv.FormatInt(userID, 10),
		)

		l := logic.NewWsConnectLogic(ctx, svcCtx)
		if err := l.WsConnect(); err != nil {
			httpx.ErrorCtx(ctx, w, err)
			return
		}

		httpx.Ok(w)
	}
}
```

流程是：

```
验证 JWT → 失败返回401
         → 成功将用户ID放入 context → 执行业务逻辑
```

#### 6.修改 [wsconnecthandler.go](E:/code/baiyun/apps/im/ws/internal/handler/wsconnecthandler.go)，实现**升级连接和原样返回消息**。

**1. 增加导入**

```go
"time"

"github.com/gorilla/websocket"
```

**2. 在 `wsConnectHandler` 内，`return func` 前面加入**

```go
upgrader := websocket.Upgrader{
	HandshakeTimeout: 5 * time.Second,

	// 只协商应用协议，不把登录令牌返回给浏览器。
	Subprotocols: []string{"baiyun"},

	// 只允许配置中的浏览器来源建立连接。
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		for _, allowed := range svcCtx.Config.AllowedOrigins {
			if origin == allowed {
				return true
			}
		}
		return false
	},
}
```

结构如下，原来的鉴权代码继续保留：

```go
func wsConnectHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	upgrader := websocket.Upgrader{
		// 上面的配置。
	}

	return func(w http.ResponseWriter, r *http.Request) {
		// 原来的鉴权和 logic 调用。
	}
}
```

**3. 将最后的 `httpx.Ok(w)` 替换为**

```go
// 将当前 HTTP 连接升级为 WebSocket。
conn, err := upgrader.Upgrade(w, r, nil)
if err != nil {
	// Upgrade 已处理握手失败响应，不再写 HTTP 响应。
	return
}
defer conn.Close()

// 限制单条消息大小，最多64 KiB。
conn.SetReadLimit(64 * 1024)

for {
	// 60秒没有收到消息，就退出并释放连接。
	if err := conn.SetReadDeadline(time.Now().Add(60 * time.Second)); err != nil {
		return
	}

	messageType, message, err := conn.ReadMessage()
	if err != nil {
		return
	}

	// 防止对方无法接收时，写操作一直阻塞。
	if err := conn.SetWriteDeadline(time.Now().Add(10 * time.Second)); err != nil {
		return
	}

	// 将消息原样返回给当前连接，暂不转发给其他用户。
	if err := conn.WriteMessage(messageType, message); err != nil {
		return
	}
}
```

这里的 `for` 会持续等待消息，**不会空转**：`ReadMessage()` 没有消息时会等待。

此阶段同一条连接依次读取、写入，不需要额外创建 goroutine 或 channel。后续再加入心跳和好友消息转发。

| 代码                    | 你现在需要理解的作用                          |
| --------------------- | ----------------------------------- |
| `authenticateWS(...)` | 确认连接的人是谁，失败就拒绝                      |
| `CheckOrigin`         | 检查连接来自哪个网页，与用户身份验证不同                |
| `Upgrade(w, r, nil)`  | 将 HTTP 连接变成 WebSocket，返回连接对象 `conn` |
| `ReadMessage()`       | 等待对方发送消息，然后读取；没有消息时会等待              |
| `WriteMessage(...)`   | 通过这条连接发送消息                          |
| `defer conn.Close()`  | 函数退出时关闭连接，释放资源                      |
把这个文件想成一个**接电话、听话、重复话的接线员**：

1. **检查通行证**：JWT 验证通过，知道你是谁。
2. **检查来源**：确认你从允许的网页连接。
3. **接通电话**：`Upgrade()` 建立 WebSocket 连接，`conn` 就像电话线。
4. **听你说话**：`ReadMessage()` 等待并接收消息。
5. **重复给你听**：`WriteMessage()` 把收到的内容原样发回。
6. **挂断电话**：函数退出时，`defer conn.Close()` 关闭连接。

核心循环就是：

```go
for {
    // 等你说一句话。
    messageType, message, err := conn.ReadMessage()
    if err != nil {
        return // 电话断了，结束。
    }

    // 把这句话原样重复给你。
    if err := conn.WriteMessage(messageType, message); err != nil {
        return
    }
}
```

**没有消息时，它是在等，不是在不停空转。**

大小限制像“每句话不能太长”，超时像“太久没人说话就挂断”。目前只是自己发、自己收到，还没有把消息转给好友。


#### 7.加入**心跳**：

```
服务器每20秒问：“还在吗？”—— Ping
浏览器自动回答：“还在。”—— Pong
收到回答，继续保留连接。
```

在 [wsconnecthandler.go](E:/code/baiyun/apps/im/ws/internal/handler/wsconnecthandler.go) 的 `conn.SetReadLimit(...)` 后、`for` 循环前加入：

```go
// 收到心跳回应，延长连接的等待时间。
conn.SetPongHandler(func(string) error {
	return conn.SetReadDeadline(time.Now().Add(60 * time.Second))
})

// 通知后台心跳任务：连接已经结束。
done := make(chan struct{})
defer close(done)

// 后台定期发送心跳，不阻塞下面的消息读取。
go func() {
	ticker := time.NewTicker(20 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			err := conn.WriteControl(
				websocket.PingMessage,
				nil,
				time.Now().Add(10*time.Second),
			)
			if err != nil {
				conn.Close()
				return
			}

		case <-done:
			return
		}
	}
}()
```

原来的消息读取和回显循环保留，将读超时注释改为：

```
// 60秒未收到消息或心跳回应，则释放连接。
```

这里首次用到三个概念：

|代码|简单理解|
|---|---|
|`go func()`|开一个后台任务|
|`ticker`|每20秒响一次的闹钟|
|`done` channel|通知后台任务停止|

心跳使用 `WriteControl`，它允许与原来的消息写入并发调用。浏览器会自动回复 Pong，不需要前端手写回复代码。

完成后测试目标改为：**不发送聊天消息，超过60秒仍能保持连接。**