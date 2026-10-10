# JWT 中的 userId 是什么时候进入 context 的？

你想弄清楚两件事：谁把 userId 放进去，以及为什么 logic 能读到它。下面以当前项目的“修改本人资料”为例，用进门检查身份的过程解释。

## 把 JWT 想成一张通行证

登录成功后，服务器给你一张有签名的通行证，上面写着：

```text
用户编号：7
到期时间：某个时间
```

这张通行证就是 JWT。这里的编号对应 userId；签名用于检查内容有没有被篡改，内容本身没有加密。

你登录时拿到通行证，只是拿到了一段字符串。这时，服务器并没有给你创建一个永久保存用户信息的 context。

## 下次请求，把通行证交给门口的检查员

修改资料时，客户端把令牌放在请求头中：

```http
PUT /api/user/7
Authorization: Bearer 你的JWT
```

go-zero 的 JWT 中间件就是“门口的检查员”。中间件表示在业务处理之前执行的一段程序：它先验证令牌签名和有效期；验证通过后，把 userId 写到随本次请求传递的“信息袋”里。

这个信息袋就是 context。不同请求传递各自的 context；中间件在这里把身份信息附加到当前请求，而不是绑定到某个线程。

下面摘录 go-zero 1.10.3 的 rest/handler/authhandler.go 中的实际代码。这是 JWT 验证通过后的处理片段，保持源码逻辑，不把它改写成简化版；前面的令牌解析与验签代码没有列在这里。

```go
claims, ok := tok.Claims.(jwt.MapClaims)
if !ok {
    unauthorized(w, r, errNoClaims, authOpts.Callback)
    return
}

ctx := r.Context()
for k, v := range claims {
    switch k {
    case jwtAudience, jwtExpire, jwtId, jwtIssueAt, jwtIssuer, jwtNotBefore, jwtSubject:
        // ignore the standard claims
    default:
        ctx = context.WithValue(ctx, k, v)
    }
}

next.ServeHTTP(w, r.WithContext(ctx))
```

### 先拿到令牌里的信息

tok 是前面已经解析并验证的令牌对象。tok.Claims 保存令牌内容；.(jwt.MapClaims) 检查它能否按键值集合使用。成功时 claims 中可以读到 userId、iat、exp；失败时调用 unauthorized 返回未授权响应，并用 return 停止处理，不进入业务接口。

### 再逐条附加到请求 context

r 是当前 HTTP 请求，类型为 *http.Request。ctx := r.Context() 取出这个请求已有的 context，保存到局部变量 ctx。

for k, v := range claims 表示逐条读取令牌字段：k 是名字，v 是值。以当前登录签发的令牌为例，某一次循环会得到 k="userId"、v="7"；字段遍历顺序不固定。

switch k 判断正在处理哪个字段。case 中列出的常量分别表示 aud、exp、jti、iat、iss、nbf、sub，它们是 JWT 的标准字段；这一分支不把它们附加到 context。userId 是自定义字段，不在该列表中，所以会走 default。

ctx = context.WithValue(ctx, k, v) 做了两件事：先创建一个附带当前键和值的新 context，再把局部变量 ctx 指向这个新 context。旧 context 没被修改；新的 context 保留旧 context 作为父级，先前已有的信息仍可沿父级查找。多个自定义字段会逐层附加，最终的 ctx 可以读取它们。

到这里，ctx 中有 userId，但原来的 r.Context() 还没有新增这个值，因为代码只重新赋值了局部变量 ctx。

### 最后把带有新 context 的请求交给下一个处理器

next.ServeHTTP(w, r.WithContext(ctx)) 这一行中，先计算参数 r.WithContext(ctx)：它返回一个请求副本，副本使用我们刚得到的新 context，原来的请求 r 不变。

随后调用 next.ServeHTTP，将两个参数交给后续 HTTP 处理器。w 是用于返回 HTTP 响应的对象，带有新 context 的请求副本是第二个参数。next 是中间件链中的下一个处理器；经过后续处理，最终到达项目的 updateUserHandler。

updateUserHandler 的参数也叫 r，但它收到的是沿链传来的请求，此时调用 r.Context() 就能取得附带 userId 的 context。两处参数都叫 r，不表示它们一直指向最初那个请求对象。

## 信息袋交给 handler，再交给 logic

当前项目的 updateUserHandler 收到请求后，将请求 context 传给 logic：

```go
l := logic.NewUpdateUserLogic(r.Context(), svcCtx)
```

NewUpdateUserLogic 把它保存为结构体字段：

```go
ctx: ctx,
```

所以进入 UpdateUser 方法时，l.ctx 就是沿着这次请求传过来的 context，其中已经附带经过 JWT 验证的 userId。

## 最后，从袋子里读取编号

```go
userId, ok := l.ctx.Value("userId").(string)
```

| 部分 | 用最简单的话解释 |
| --- | --- |
| l.ctx | 当前请求传来的信息袋 |
| Value("userId") | 找标着 userId 的那条信息 |
| .(string) | 检查这条信息是不是字符串 |
| userId | 找到的编号，例如 "7" |
| ok | 是字符串则为 true；没有该值或类型不符则为 false |

登录代码用 strconv.FormatInt(result.Id, 10) 把编号写成字符串，所以这里用 string 读取。登录端写入什么类型，读取端就要按对应类型判断。

读到编号后，当前项目还会比较它和路径中的 ID：通行证写“7”，就只能修改 /api/user/7，不能改 /api/user/8。令牌验证确认“你是谁”，编号比较确认“你能操作谁”。

## 在项目里找这条线

```text
登录：账号密码正确 → API 签发 JWT → 返回客户端

修改资料：客户端携带 JWT
         → JWT 中间件验证
         → 把 userId 附加到请求 context
         → updateUserHandler 传入 r.Context()
         → NewUpdateUserLogic 保存为 l.ctx
         → UpdateUser 读取并检查操作权限
```

| 文件（相对仓库根目录） | 你可以看到什么 |
| --- | --- |
| apps/user/api/internal/logic/loginlogic.go | userId 写入 JWT 的位置 |
| apps/user/api/user.api | @server(jwt: Auth) 声明受保护接口 |
| apps/user/api/internal/handler/routes.go | rest.WithJwt 启用 JWT 验证 |
| apps/user/api/internal/handler/updateuserhandler.go | 请求 context 传给 logic |
| apps/user/api/internal/logic/updateuserlogic.go | 保存 context、读取 userId、检查本人权限 |

没有启用 JWT 中间件的接口，不会由这段流程自动得到 userId。仅在请求 JSON 中写 userId，也不会把它变成经过验证的身份。

2026-10-04 已依据这些实际文件及本地 go-zero 1.10.3 的 rest/handler/authhandler.go 核对。本文未修改业务代码，未执行构建或请求验证。可在更新接口前设置断点：有效 JWT 应读到其 userId，无令牌应被中间件拒绝，他人 ID 应被 logic 拒绝。相关功能进度见 [注册与登录](../user-auth.md)。
