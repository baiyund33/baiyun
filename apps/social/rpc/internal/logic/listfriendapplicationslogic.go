package logic

import (
	"context"

	"baiyun/apps/social/rpc/internal/svc"
	"baiyun/apps/social/rpc/social"

	"github.com/zeromicro/go-zero/core/logx"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type ListFriendApplicationsLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
	logx.Logger
}

func NewListFriendApplicationsLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ListFriendApplicationsLogic {
	return &ListFriendApplicationsLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
		Logger: logx.WithContext(ctx),
	}
}

func (l *ListFriendApplicationsLogic) ListFriendApplications(in *social.ListFriendApplicationsRequest) (*social.ListFriendApplicationsResponse, error) {
	//API 的 ctx 不会自动通过网络传到 RPC
	userId := in.GetUserId()
	if userId <= 0 {
		return nil, status.Error(codes.InvalidArgument, "用户ID必须大于0")
	}
	page := int64(in.GetPage())
	pageSize := int64(in.GetPageSize())
	if page == 0 {
		page = 1
	}
	if pageSize == 0 {
		pageSize = 20
	}

	if page < 1 || pageSize < 1 || pageSize > 100 {
		return nil, status.Error(codes.InvalidArgument, "页码必须大于0，每页数量为1到100")
	}
	model := l.svcCtx.FriendRequestModel
	total, err := model.CountReceived(l.ctx, userId)
	if err != nil {
		return nil, status.Error(codes.Internal, "获取收到的申请数量失败")
	}
	offset := (page - 1) * pageSize
	records, err := model.FindReceived(l.ctx, userId, pageSize, offset)
	if err != nil {
		return nil, status.Error(codes.Internal, "查询好友申请失败")
	}
	list := make([]*social.FriendApplication, 0, len(records))
	for _, record := range records {
		list = append(list, &social.FriendApplication{
			Id:         record.Id,
			FromUserId: record.FromUserId,
			Message:    record.Message,
			Status:     int32(record.Status),
			CreatedAt:  record.CreatedAt.Unix(),
			UpdatedAt:  record.UpdatedAt.Unix(),
		})
	}
	return &social.ListFriendApplicationsResponse{
		List:  list,
		Total: total,
	}, nil
}
