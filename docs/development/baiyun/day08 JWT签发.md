#### 1.**给 API 增加 JWT 密钥和有效期配置**。
修改 [config.go](E:/code/baiyun/apps/user/api/internal/config/config.go)：

```
type Config struct {
    rest.RestConf
    UserRpc zrpc.RpcClientConf

    Auth struct {
        AccessSecret string
        AccessExpire int64
    }
}
```

在 [API 的 user.yaml](E:/code/baiyun/apps/user/api/etc/user.yaml) 中增加顶层配置，与 `UserRpc` 同级：

```
Auth:
  AccessSecret: "替换为至少32字节的随机密钥"
  AccessExpire: 7200
```

| 字段             | 作用                             |
| -------------- | ------------------------------ |
| `AccessSecret` | JWT 签名和验证使用的密钥，需替换占位值，不提交到 Git |
| `AccessExpire` | 令牌有效时长，单位秒；`7200` 为两小时         |
#### 2.**登录成功后签发 JWT**。
1. 在 [user.api](E:/code/baiyun/apps/user/api/user.api) 中修改：

```
LoginResp {
    Id           int64  `json:"id"`
    Name         string `json:"name"`
    AccessToken  string `json:"accessToken"`
    AccessExpire int64  `json:"accessExpire"`
}
```

重新生成：

```
goctl api go -api apps/user/api/user.api -dir apps/user/api
```

2. 在 [API loginlogic.go](E:/code/baiyun/apps/user/api/internal/logic/loginlogic.go) 中增加导入：

```
"errors"
"strconv"
"time"

"github.com/golang-jwt/jwt/v4"
```

3. 在 RPC 调用的错误检查之后，将原来的成功返回部分替换为：

```
now := time.Now().Unix()
expire := now + l.svcCtx.Config.Auth.AccessExpire

token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
    "userId": strconv.FormatInt(result.Id, 10),
    "iat":    now,
    "exp":    expire,
})

accessToken, err := token.SignedString(
    []byte(l.svcCtx.Config.Auth.AccessSecret),
)
if err != nil {
    return nil, errors.New("令牌生成失败")
}

return &types.LoginResp{
    Id:           result.Id,
    Name:         result.Name,
    AccessToken:  accessToken,
    AccessExpire: expire,
}, nil
```

`iat` 是签发时间，`exp` 是到期时间。完成后构建：

```
go mod tidy
go build ./apps/user/api/...
```

#### 3.保护修改、删除接口，并限制只能操作本人

1. 在 [user.api](E:/code/baiyun/apps/user/api/user.api) 中，将修改、删除路由从原来的 `service user` 移出，放入新增分组：

```
@server (
    jwt: Auth
)
service user {
    @handler updateUser
    put /api/user/:id (UpdateUserReq) returns (UpdateUserResp)

    @handler deleteUser
    delete /api/user/:id (DeleteUserReq) returns (DeleteUserResp)
}
```

注册、登录和 Ping 保留在公开分组。旧 `POST /api/user` 创建入口可以移除，统一使用注册接口。

2. 重新生成：

```
goctl api go -api apps/user/api/user.api -dir apps/user/api
```

3. 在 API 的 `updateuserlogic.go`、`deleteuserlogic.go` 中，**调用 RPC 之前**都加入：

```go
userId, ok := l.ctx.Value("userId").(string)
if !ok || userId == "" {
    return nil, status.Error(codes.Unauthenticated, "请先登录")
}
if userId != strconv.FormatInt(req.Id, 10) {
    return nil, status.Error(codes.PermissionDenied, "只能操作本人账户")
}
```

增加导入：

```
"strconv"

"google.golang.org/grpc/codes"
"google.golang.org/grpc/status"
```

JWT 中间件负责验证令牌；这段代码负责检查操作权限。

Postman 请求修改接口时，携带：

```
Authorization: Bearer 登录返回的accessToken
```

验证无令牌被拒绝、本人 ID 可操作、其他用户 ID 被拒绝。


#### 4.写入 context 的逻辑由 go-zero 的 JWT 中间件实现，我们不用手写。
你在 `.api` 中声明：

```
@server (
    jwt: Auth
)
```

goctl 会在 [routes.go](E:/code/baiyun/apps/user/api/internal/handler/routes.go) 中生成：

```
server.AddRoutes(
    []rest.Route{
        // 修改、删除等受保护路由
    },
    rest.WithJwt(serverCtx.Config.Auth.AccessSecret),
)
```

`rest.WithJwt(...)` 为这组路由配置 JWT 验证。**请求访问这些路由时，框架会先执行 JWT 中间件，再进入 handler。**

```
请求携带 JWT
  → go-zero 验证签名和有效期
  → 将 userId 放入请求 context
  → updateUserHandler
  → UpdateUserLogic 读取 userId
```

我们编写的是登录时**签发 JWT**、声明哪些接口需要验证，以及业务中的本人权限判断；验签和写入 context 由框架完成。