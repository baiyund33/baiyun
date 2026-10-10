// Code scaffolded by goctl. Safe to edit.
// goctl 1.10.2

package svc

import (
	"baiyun/apps/user/api/internal/config"

	"baiyun/apps/user/rpc/userclient"
	"github.com/zeromicro/go-zero/zrpc"
)

type ServiceContext struct {
	Config config.Config

	UserRpc userclient.User //把用户服务的客户端保存在 ServiceContext 中，供各个 logic 共用。
}

func NewServiceContext(c config.Config) *ServiceContext {
	return &ServiceContext{
		Config: c,

		UserRpc: userclient.NewUser(zrpc.MustNewClient(c.UserRpc)),
	}
}
