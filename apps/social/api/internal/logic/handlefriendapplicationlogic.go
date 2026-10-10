// Code scaffolded by goctl. Safe to edit.
// goctl 1.10.2

package logic

import (
	"baiyun/apps/social/api/internal/svc"
	"baiyun/apps/social/api/internal/types"
	"baiyun/apps/social/rpc/socialclient"
	"baiyun/pkg/ctxdata"
	"context"

	"github.com/zeromicro/go-zero/core/logx"
)

type HandleFriendApplicationLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewHandleFriendApplicationLogic(ctx context.Context, svcCtx *svc.ServiceContext) *HandleFriendApplicationLogic {
	return &HandleFriendApplicationLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *HandleFriendApplicationLogic) HandleFriendApplication(req *types.HandleFriendApplicationReq) (resp *types.HandleFriendApplicationResp, err error) {
	userId, err := ctxdata.GetUserID(l.ctx)
	if err != nil {
		return nil, err
	}
	result, err := l.svcCtx.SocialRpc.HandleFriendApplication(l.ctx, &socialclient.HandleFriendApplicationRequest{
		Id:     req.Id,
		UserId: userId,
		Status: req.Status,
	})
	if err != nil {
		return nil, err
	}
	return &types.HandleFriendApplicationResp{
		Id:     result.Id,
		Status: result.Status,
	}, nil
}
