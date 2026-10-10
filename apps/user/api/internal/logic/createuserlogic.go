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

type CreateUserLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewCreateUserLogic(ctx context.Context, svcCtx *svc.ServiceContext) *CreateUserLogic {
	return &CreateUserLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *CreateUserLogic) CreateUser(req *types.CreateUserReq) (resp *types.CreateUserResp, err error) {
	u, err := l.svcCtx.UserRpc.CreateUser(l.ctx, &userclient.CreateUserRequest{
		Name:  req.Name,
		Phone: req.Phone,
	})
	if err != nil {
		return nil, err
	}
	return &types.CreateUserResp{
		Id: u.Id,
	}, nil
}
