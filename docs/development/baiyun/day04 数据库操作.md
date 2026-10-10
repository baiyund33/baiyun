#### 1.`goctl model` + `sqlx`
第一步编写建表 SQL。在 `apps/user/rpc` 下创建 `models` 文件夹，再创建 `user.sql`：

```sql
CREATE TABLE `user` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '用户编号',
    `name` VARCHAR(64) NOT NULL COMMENT '用户名',
    `phone` VARCHAR(20) NOT NULL COMMENT '手机号',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';
```

#### 2.执行goctl命令
```
goctl model mysql ddl -src apps/user/rpc/models/user.sql -dir apps/user/rpc/models
```

|部分|作用|
|---|---|
|`goctl`|运行 go-zero 代码生成工具|
|`model mysql`|生成 MySQL 数据访问代码|
|`ddl`|从建表 SQL 读取表结构|
|`-src apps/user/rpc/models/user.sql`|指定输入的 SQL 文件|
|`-dir apps/user/rpc/models`|指定生成代码的目录|

生成的 model 使用 `sqlx`，提供基础增删改查方法。**该命令不会连接数据库，也不会执行建表 SQL。**


#### 4.初始化 `UserModel`
model 已生成。下一步在 [RPC servicecontext.go](E:/code/baiyun/apps/user/rpc/internal/svc/servicecontext.go) 中初始化 `UserModel`，供业务逻辑使用。

增加导入：

```go
"baiyun/apps/user/rpc/models"
```

在 `ServiceContext` 中增加字段：

```go
UserModel models.UserModel
```

将初始化函数改为：

```go
func NewServiceContext(c config.Config) *ServiceContext {
    conn := sqlx.NewMysql(c.Mysql.DataSource)

    return &ServiceContext{
        Config:    c,
        MysqlConn: conn,
        Redis:     redis.MustNewRedis(c.Redisx),
        UserModel: models.NewUserModel(conn),
    }
}
```

这里让 `MysqlConn` 和 `UserModel` 共用同一个连接对象。

#### 5.实际开发
`UserModel` 已接入。下一步在 [user.proto](E:/code/baiyun/apps/user/rpc/user.proto) 中定义“新增用户”。

在现有 `service User` 前增加：

```go
message CreateUserRequest {
  string name = 1;
  string phone = 2;
}

message CreateUserResponse {
  int64 id = 1;
}
```

在**现有的** `service User` 内增加方法，保留 `Ping`：

```go
service User {
  rpc Ping(PingRequest) returns (PingResponse);
  rpc CreateUser(CreateUserRequest) returns (CreateUserResponse);
}
```

请求传入用户名和手机号，响应返回数据库生成的用户 ID。
执行
```goctl
goctl rpc protoc apps/user/rpc/user.proto --go_out=apps/user/rpc --go-grpc_out=apps/user/rpc --zrpc_out=apps/user/rpc --name-from-filename
```


示例增加用户
![[createuserlogic.go]]
```go
func (l *CreateUserLogic) CreateUser(in *user.CreateUserRequest) (*user.CreateUserResponse, error) {  
    result, err := l.svcCtx.UserModel.Insert(l.ctx, &models.User{  
       Name:  in.Name,  
       Phone: in.Phone,  
    })  
    if err != nil {  
       return nil, err  
    }  
    id, err := result.LastInsertId()  
    return &user.CreateUserResponse{  
       Id: id,  
    }, nil  
}
```
这是 `database/sql` 定义的 **执行结果接口**，提供两个方法：

| 方法               | 返回内容                  |
| ---------------- | --------------------- |
| `LastInsertId()` | 本次插入生成的自增 ID，以及获取时的错误 |
| `RowsAffected()` | 本次 SQL 影响的行数，以及获取时的错误 |

#### 附加
```go
UserModel interface {
    userModel
    withSession(session sqlx.Session) UserModel
}
```

这里定义了 `UserModel` 接口，包含两部分：

|内容|意思|
|---|---|
|`userModel`|**嵌入另一个接口**，继承其中的 `Insert`、`FindOne`、`Update`、`Delete` 等方法|
|`withSession(...)`|声明一个方法：接收数据库会话，返回使用该会话的 `UserModel`|

`sqlx.Session` 通常用于**数据库事务**。`withSession` 让 model 的操作使用指定事务，便于多个操作一起提交或回滚。

注意：这里都是**方法声明**，具体实现要看对应的方法体。
不是，必须实现 **`userModel` 中的全部方法，加上 `withSession`**，才能满足 `UserModel` 接口。

例如，假设 `userModel` 定义了四个方法，就需要满足：

```
Insert
FindOne
Update
Delete
withSession
```