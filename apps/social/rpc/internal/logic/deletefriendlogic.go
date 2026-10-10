package logic

import (
	"context"

	"baiyun/apps/social/rpc/internal/svc"
	"baiyun/apps/social/rpc/social"

	"github.com/zeromicro/go-zero/core/logx"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type DeleteFriendLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
	logx.Logger
}

func NewDeleteFriendLogic(ctx context.Context, svcCtx *svc.ServiceContext) *DeleteFriendLogic {
	return &DeleteFriendLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
		Logger: logx.WithContext(ctx),
	}
}

func (l *DeleteFriendLogic) DeleteFriend(in *social.DeleteFriendRequest) (*social.DeleteFriendResponse, error) {
	userId := in.UserId
	friendUserId := in.FriendUserId
	if userId <= 0 || friendUserId <= 0 {
		return nil, status.Error(codes.InvalidArgument, "用户ID和好友用户ID必须大于0")
	}
	if userId == friendUserId {
		return nil, status.Error(codes.InvalidArgument, "不能删除自己")
	}
	deleted, err := l.svcCtx.FriendModel.DeleteByUserID(l.ctx, userId, friendUserId)
	if err != nil {
		return nil, status.Error(codes.Internal, "删除好友失败")
	}
	if !deleted {
		return nil, status.Error(codes.NotFound, "好友关系不存在")
	}
	return &social.DeleteFriendResponse{
		FriendUserId: friendUserId,
	}, nil
}
