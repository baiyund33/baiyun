// Code scaffolded by goctl. Safe to edit.
// goctl 1.10.2

package logic

import (
	"baiyun/apps/user/rpc/userclient"
	"context"

	"baiyun/apps/user/api/internal/svc"
	"baiyun/apps/user/api/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type RegisterLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewRegisterLogic(ctx context.Context, svcCtx *svc.ServiceContext) *RegisterLogic {
	return &RegisterLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *RegisterLogic) Register(req *types.RegisterReq) (resp *types.RegisterResp, err error) {
	result, err := l.svcCtx.UserRpc.Register(l.ctx, &userclient.RegisterRequest{
		Name:     req.Name,
		Phone:    req.Phone,
		Password: req.Password,
	})
	if err != nil {
		return nil, err
	}
	return &types.RegisterResp{
		Id: result.Id,
	}, nil
}
