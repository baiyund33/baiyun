#### 1.api文件
先修改 `user.api`，保留现有 Ping 定义。

在现有 `type (...)` 中加入：

```api
CreateUserReq {
    Name  string `json:"name"`
    Phone string `json:"phone"`
}
CreateUserResp {
    Id int64 `json:"id"`
}

UpdateUserReq {
    Id    int64  `path:"id"`
    Name  string `json:"name"`
    Phone string `json:"phone"`
}
UpdateUserResp {
    Id int64 `json:"id"`
}

DeleteUserReq {
    Id int64 `path:"id"`
}
DeleteUserResp {
    Id int64 `json:"id"`
}
```

在现有 `service user {...}` 中加入：

```
@handler createUser
post /api/user (CreateUserReq) returns (CreateUserResp)

@handler updateUser
put /api/user/:id (UpdateUserReq) returns (UpdateUserResp)

@handler deleteUser
delete /api/user/:id (DeleteUserReq) returns (DeleteUserResp)
```

`path:"id"` 表示从 URL 获取 ID，例如 `/api/user/1`。

保存后，在项目根目录执行：

```
goctl api go -api apps/user/api/user.api -dir apps/user/api
```

#### 2.其他代码
三个 API logic 已生成。下一步分别接入 RPC，三个文件都需要增加导入：

```go
"baiyun/apps/user/rpc/userclient"
```

替换 [createuserlogic.go](E:/code/baiyun/apps/user/api/internal/logic/createuserlogic.go) 的方法：

```go
func (l *CreateUserLogic) CreateUser(req *types.CreateUserReq) (*types.CreateUserResp, error) {
    result, err := l.svcCtx.UserRpc.CreateUser(l.ctx, &userclient.CreateUserRequest{
        Name:  req.Name,
        Phone: req.Phone,
    })
    if err != nil {
        return nil, err
    }
    return &types.CreateUserResp{Id: result.Id}, nil
}
```