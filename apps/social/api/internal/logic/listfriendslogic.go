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
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type ListFriendsLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewListFriendsLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ListFriendsLogic {
	return &ListFriendsLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ListFriendsLogic) ListFriends(req *types.ListFriendsReq) (resp *types.ListFriendsResp, err error) {
	userId, err := ctxdata.GetUserID(l.ctx)
	if err != nil {
		return nil, err
	}
	records, err := l.svcCtx.SocialRpc.ListFriends(l.ctx, &socialclient.ListFriendsRequest{
		UserId:   userId,
		Page:     req.Page,
		PageSize: req.PageSize,
	})
	if err != nil {
		return nil, err
	}
	list := make([]types.FriendInfo, 0, len(records.List))
	for _, record := range records.List {
		if record.Id <= 0 || record.FriendUserId <= 0 {
			return nil, status.Error(codes.Internal, "好友记录数据异常")
		}
		list = append(list, types.FriendInfo{
			Id:           record.Id,
			FriendUserId: record.FriendUserId,
			Name:         record.Name,
			CreatedAt:    record.CreatedAt,
		})
	}

	return &types.ListFriendsResp{
		Friends: list,
		Total:   records.Total,
	}, nil
}
