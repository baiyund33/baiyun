**把已验证的用户 ID 放入上下文，让后面的业务逻辑知道当前是谁在连接。**

```
ctx := context.WithValue(
    r.Context(),
    "userId",
    strconv.FormatInt(userID, 10),
)
```

三个参数分别是：

|参数|作用|
|---|---|
|`r.Context()`|当前 HTTP 请求的上下文，包含取消信号等信息|
|`"userId"`|保存数据使用的键，后续通过它取出用户 ID|
|`strconv.FormatInt(userID, 10)`|把 `int64` 用户 ID 转成十进制字符串，例如 `123` → `"123"`|

`context.WithValue` 会创建一个**带有这个值的新上下文**，保存在变量 `ctx` 中。它保留原上下文的取消信号等信息，不会修改原来的 `r.Context()`。

接下来：

```
l := logic.NewWsConnectLogic(ctx, svcCtx)
```

你把这个新上下文交给了业务逻辑，业务逻辑就可以读取身份：

```
userIDText, ok := l.ctx.Value("userId").(string)
```

这里的 `.(string)` 是类型断言：确认取出来的值是字符串；`ok` 表示是否成功。项目中通常通过已有的 `ctxdata.GetUserID` 封装读取和转换。

整个流程是：

```
authenticateWS 验证 JWT，得到 userID
    ↓
将 userID 放入 ctx
    ↓
把 ctx 传给 logic
    ↓
logic 从 ctx 获取当前用户身份
```

例如后续发送消息时，业务逻辑可以用这个身份确定发送者，避免相信客户端自行填写的发送者 ID。

另外，**这段代码不会把用户 ID 发给浏览器，也不会写入数据库**；它只是把身份传递给服务端后续代码。当前 `WsConnect` 还没有实际使用这个身份。