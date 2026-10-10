#### 1.读取连接配置
在 `config.go` 中增加 Redis 导入，并在 `Config` 中加入：

```go
Mysql struct {
    DataSource string
}
Redisx redis.RedisConf
```

在 user.yaml中增加：

```yml
Mysql:
  DataSource: "用户名:密码@tcp(127.0.0.1:3306)/baiyun?charset=utf8mb4&parseTime=true&loc=Local"

Redisx:
  Host: 127.0.0.1:6379
  Type: node
  Pass: ""
```

#### 2.实际连接 -> `servicecontext.go`
下一步在 `servicecontext.go` 初始化依赖。参照项目的 `ServiceContext` 写法，改为：

```go
package svc

import (
    "baiyun/apps/user/rpc/internal/config"

    "github.com/zeromicro/go-zero/core/stores/redis"
    "github.com/zeromicro/go-zero/core/stores/sqlx"
)

type ServiceContext struct {
    Config    config.Config
    MysqlConn sqlx.SqlConn
    Redis     *redis.Redis
}

func NewServiceContext(c config.Config) *ServiceContext {
    return &ServiceContext{
        Config:    c,
        MysqlConn: sqlx.NewMysql(c.Mysql.DataSource),
        Redis:     redis.MustNewRedis(c.Redisx),
    }
}
```

`MysqlConn` 留给后续的数据访问代码使用；`Redis` 留给缓存代码使用。**启动时 Redis 会检查连接**，MySQL 则通常到首次执行查询时才暴露连接错误。你改好后先执行 `go build ./apps/user/rpc/...`；启动服务前确认 Redis 和现有的 etcd 都可连接。