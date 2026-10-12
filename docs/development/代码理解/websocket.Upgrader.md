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
这段代码创建一个 **WebSocket 升级器 `upgrader`**，并规定连接升级时的超时、子协议和来源检查规则。

此时只是准备配置，真正升级连接是在后面调用：

```
conn, err := upgrader.Upgrade(w, r, nil)
```

逐项来看：

**1. 握手超时**

```
HandshakeTimeout: 5 * time.Second,
```

限制升级握手过程的等待时间，避免一直卡在握手响应阶段。它不代表连接只能维持 5 秒，也不负责聊天消息或心跳的超时。

**2. 选择子协议**

```
Subprotocols: []string{"baiyun"},
```

子协议是客户端和服务端约定的应用通信协议名称。

你的浏览器建立连接时发送：

```
new WebSocket(url, ["baiyun", token])
```

请求头中会携带：

```
Sec-WebSocket-Protocol: baiyun, <登录JWT>
```

鉴权函数先从中取出 JWT 验证身份；升级器则只选择双方支持的 `"baiyun"`，成功响应中返回：

```
Sec-WebSocket-Protocol: baiyun
```

因此 JWT 不会被当成协商结果返回。这里的 `"baiyun"` 只是约定名称，消息格式仍需你自己定义。

**3. 检查浏览器来源**

```
CheckOrigin: func(r *http.Request) bool {
    origin := r.Header.Get("Origin")
    for _, allowed := range svcCtx.Config.AllowedOrigins {
        if origin == allowed {
            return true
        }
    }
    return false
},
```

这是一个回调函数：调用 `Upgrade` 时，升级器会调用它检查请求是否来自允许的网页。

例如用户打开：

```
http://localhost:3000
```

该页面中的 JavaScript 发起 WebSocket 连接时，浏览器通常会携带：

```
Origin: http://localhost:3000
```

代码从请求头读取这个值，再与配置中的 `AllowedOrigins` 逐项比较：

```
找到完全一致的来源 → true → 允许继续升级
没有匹配的来源     → false → 拒绝握手，返回 HTTP 403
```

这里是字符串精确比较，所以：

```
http://localhost:3000
http://127.0.0.1:3000
```

会被视为两个不同来源。当前实现也会拒绝没有 `Origin` 的请求，除非配置明确允许空字符串。

**来源检查和 JWT 鉴权负责不同事情**：来源检查判断哪个网页发起连接，JWT 判断连接者是谁。非浏览器客户端可以自行填写 `Origin`，所以它不能代替身份验证。

整段配置对应的流程是：

```
先验证 JWT
    ↓
调用 Upgrade
    ↓
检查 Origin 是否允许
    ↓
协商 baiyun 子协议并完成握手
    ↓
得到 conn，开始收发 WebSocket 消息
```

14:10
