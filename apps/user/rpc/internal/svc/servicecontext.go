package svc

import (
	"baiyun/apps/user/rpc/internal/config"
	"baiyun/apps/user/rpc/models"

	"github.com/zeromicro/go-zero/core/stores/redis"
	"github.com/zeromicro/go-zero/core/stores/sqlx"
)

type ServiceContext struct {
	Config    config.Config
	MysqlConn sqlx.SqlConn
	Redis     *redis.Redis
	UserModel models.UserModel
}

func NewServiceContext(c config.Config) *ServiceContext {
	conn := sqlx.NewMysql(c.Mysql.DataSource)
	return &ServiceContext{
		Config:    c,
		MysqlConn: conn,
		Redis:     redis.MustNewRedis(c.Redisx),

		UserModel: models.NewUserModel(conn),
	}
}
