package logic

import (
	"context"

	"baiyun/apps/user/rpc/internal/svc"
	"baiyun/apps/user/rpc/user"

	"github.com/zeromicro/go-zero/core/logx"
)

type PingLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
	logx.Logger
}

func NewPingLogic(ctx context.Context, svcCtx *svc.ServiceContext) *PingLogic {
	return &PingLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
		Logger: logx.WithContext(ctx),
	}
}

// 定义 Ping 方法：接收 PingRequest，返回 PingResponse。
func (l *PingLogic) Ping(in *user.PingRequest) (*user.PingResponse, error) {
	return &user.PingResponse{
		Message: "hello, " + in.GetName(),
	}, nil
}
