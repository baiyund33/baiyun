package svc

import (
	"baiyun/apps/social/rpc/internal/config"
	"baiyun/apps/social/rpc/models"
	"baiyun/apps/user/rpc/userclient"

	"github.com/zeromicro/go-zero/core/stores/sqlx"
	"github.com/zeromicro/go-zero/zrpc"
)

type ServiceContext struct {
	Config             config.Config
	MysqlConn          sqlx.SqlConn
	FriendRequestModel models.FriendRequestModel
	UserRpc            userclient.User
	FriendModel        models.FriendModel
}

func NewServiceContext(c config.Config) *ServiceContext {
	conn := sqlx.NewMysql(c.Mysql.DataSource)
	return &ServiceContext{
		Config:             c,
		MysqlConn:          conn,
		FriendRequestModel: models.NewFriendRequestModel(conn),
		UserRpc:            userclient.NewUser(zrpc.MustNewClient(c.UserRpc)),
		FriendModel:        models.NewFriendModel(conn),
	}
}
