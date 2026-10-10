// Code scaffolded by goctl. Safe to edit.
// goctl 1.10.2

package logic

import (
	"context"

	"baiyun/apps/user/api/internal/svc"
	"baiyun/apps/user/api/internal/types"

	"github.com/zeromicro/go-zero/core/logx"

	"baiyun/apps/user/rpc/userclient"
)

type PingLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewPingLogic(ctx context.Context, svcCtx *svc.ServiceContext) *PingLogic {
	return &PingLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *PingLogic) Ping(req *types.PingReq) (resp *types.PingResp, err error) {
	result, err := l.svcCtx.UserRpc.Ping(l.ctx, &userclient.PingRequest{
		Name: req.Name,
	})
	if err != nil {
		return nil, err
	}
	return &types.PingResp{
		Message: result.Message,
	}, nil
}
