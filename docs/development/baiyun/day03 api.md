#### 1.api文件
```api
syntax = "v1"  
  
  
info (  
    title: "用户服务 API"    desc:  "提供用户相关的 HTTP 接口"  
)  
  
type (  
    PingReq {  
        Name string `json:"name"`  
    }  
    PingResp {  
        Message string `json:"message"`  
    }  
)  
  
service user {  
    @handler ping  
    post /api/user/ping (PingReq) returns (PingResp)  
}
```
- `title`：API 的标题，例如“用户服务 API”。
- `desc`：API 的简短说明，例如“提供用户相关的 HTTP 接口”。

它们是**描述信息**，方便阅读和生成文档；不会改变接口地址，也不会影响请求处理。

|内容|作用|
|---|---|
|`service user`|声明名为 `user` 的 API 服务。|
|`@handler ping`|指定处理函数的名称；生成代码后，`pingHandler` 会接收这个请求。|
|`post /api/user/ping`|客户端用 HTTP POST 请求这个路径。|
|`(PingReq)`|请求数据按 `PingReq` 解析。|
|`returns (PingResp)`|响应数据按 `PingResp` 返回。|

`goctl` 会据此生成路由和处理代码。**它还不会自动调用 RPC**；后面需要你在生成的 `pinglogic.go` 中接入 `User.Ping`

#### 2.goctl命令
```
goctl api go -api apps/user/api/user.api -dir apps/user/api
```

| 部分                            | 作用                             |
| ----------------------------- | ------------------------------ |
| `goctl`                       | 运行 go-zero 的代码生成工具             |
| `api go`                      | 根据 `.api` 定义生成 Go 语言的 API 服务骨架 |
| `-api apps/user/api/user.api` | 指定输入的接口定义文件                    |
| `-dir apps/user/api`          | 指定生成代码的目标目录                    |
#### 3.配置 API 如何找到 user RPC
在 `API config.go`导入 `github.com/zeromicro/go-zero/zrpc`，并在 `Config` 中加入：

```
UserRpc zrpc.RpcClientConf
```

在 `API user.yaml` 末尾加入：
Etcd配置需要和rpc中一致才能找到
```
UserRpc:
  Endpoints:
    - 127.0.0.1:8080
      
  Etcd:  
  Hosts:  
    - 43.136.35.79:2379  
  Key: user.rpc
```

`Endpoints` 指向本机运行的 user RPC。参考项目通过 etcd 查找 RPC；这一步先用固定地址打通调用链。改好后，下一步在 API 的 `ServiceContext` 创建 RPC 客户端。

#### 4.通过client调用rpc方法
修改 `API pinglogic.go`

在 `import` 中增加：

```
"baiyun/apps/user/rpc/userclient"
```

将 `Ping` 方法改为：

```go
func (l *PingLogic) Ping(req *types.PingReq) (*types.PingResp, error) {
    // 将 HTTP 请求参数传给用户 RPC。
    result, err := l.svcCtx.UserRpc.Ping(l.ctx, &userclient.PingRequest{
        Name: req.Name,
    })
    if err != nil {
        return nil, err
    }

    // 将 RPC 响应转换为 HTTP 响应。
    return &types.PingResp{
        Message: result.Message,
    }, nil
}
```

`.Ping` 指的是 **用户 RPC 客户端的 Ping 方法**，对应 `user.proto` 中定义的：

```
rpc Ping(PingRequest) returns (PingResponse);
```

所以：

```
l.svcCtx.UserRpc.Ping(...)
```

表示通过 `UserRpc` 客户端发起远程调用，最终由 **RPC 服务端的 `PingLogic.Ping`** 执行业务逻辑。

调用代码已经接好，但 [API user.yaml](E:/code/baiyun/apps/user/api/etc/user.yaml) 同时配置了 `Endpoints` 和 `Etcd`。**`Endpoints` 优先，会绕过 etcd**，先删除这部分：

```
Endpoints:
  - 127.0.0.1:8080
```