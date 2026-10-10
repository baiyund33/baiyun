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

type ApplyFriendLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewApplyFriendLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ApplyFriendLogic {
	return &ApplyFriendLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ApplyFriendLogic) ApplyFriend(req *types.ApplyFriendReq) (resp *types.ApplyFriendResp, err error) {
	userId, err := ctxdata.GetUserID(l.ctx)
	if err != nil {
		return nil, err
	}
	result, err := l.svcCtx.SocialRpc.ApplyFriend(l.ctx, &socialclient.ApplyFriendRequest{
		FromUserId: userId,
		ToUserId:   req.ToUserId,
		Message:    req.Message,
	})
	if err != nil {
		return nil, err
	}
	return &types.ApplyFriendResp{Id: result.Id}, nil
}
