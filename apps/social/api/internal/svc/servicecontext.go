// Code scaffolded by goctl. Safe to edit.
// goctl 1.10.2

package svc

import (
	"baiyun/apps/social/api/internal/config"
	"baiyun/apps/social/rpc/socialclient"

	"github.com/zeromicro/go-zero/zrpc"
)

type ServiceContext struct {
	Config    config.Config
	SocialRpc socialclient.Social
}

func NewServiceContext(c config.Config) *ServiceContext {
	return &ServiceContext{
		Config: c,

		SocialRpc: socialclient.NewSocial(zrpc.MustNewClient(c.SocialRpc)),
	}
}
