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

type ListFriendApplicationsLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewListFriendApplicationsLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ListFriendApplicationsLogic {
	return &ListFriendApplicationsLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ListFriendApplicationsLogic) ListFriendApplications(req *types.ListFriendApplicationsReq) (resp *types.ListFriendApplicationsResp, err error) {
	userId, err := ctxdata.GetUserID(l.ctx)
	if err != nil {
		return nil, err
	}
	records, err := l.svcCtx.SocialRpc.ListFriendApplications(l.ctx, &socialclient.ListFriendApplicationsRequest{
		UserId:   userId,
		Page:     req.Page,
		PageSize: req.PageSize,
	})
	if err != nil {
		return nil, err
	}
	list := make([]types.FriendApplication, 0, len(records.List))
	for _, record := range records.List {
		list = append(list, types.FriendApplication{
			Id:         record.Id,
			FromUserId: record.FromUserId,
			Message:    record.Message,
			Status:     record.Status,
		})
	}

	return &types.ListFriendApplicationsResp{
		Applications: list,
		Total:        records.Total,
	}, nil
}
