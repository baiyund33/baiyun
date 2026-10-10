// Code scaffolded by goctl. Safe to edit.
// goctl 1.10.2

package logic

import (
	"baiyun/apps/social/rpc/socialclient"
	"baiyun/pkg/ctxdata"
	"context"

	"baiyun/apps/social/api/internal/svc"
	"baiyun/apps/social/api/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
)

type DeleteFriendLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewDeleteFriendLogic(ctx context.Context, svcCtx *svc.ServiceContext) *DeleteFriendLogic {
	return &DeleteFriendLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *DeleteFriendLogic) DeleteFriend(req *types.DeleteFriendReq) (resp *types.DeleteFriendResp, err error) {
	userId, err := ctxdata.GetUserID(l.ctx)
	if err != nil {
		return nil, err
	}
	result, err := l.svcCtx.SocialRpc.DeleteFriend(l.ctx, &socialclient.DeleteFriendRequest{
		UserId:       userId,
		FriendUserId: req.FriendUserId,
	})
	if err != nil {
		return nil, err
	}

	return &types.DeleteFriendResp{
		FriendUserId: result.FriendUserId,
	}, nil
}
