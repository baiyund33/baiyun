package logic

import (
	"context"

	"baiyun/apps/user/rpc/internal/svc"
	"baiyun/apps/user/rpc/user"

	"github.com/zeromicro/go-zero/core/logx"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type GetUsersLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
	logx.Logger
}

func NewGetUsersLogic(ctx context.Context, svcCtx *svc.ServiceContext) *GetUsersLogic {
	return &GetUsersLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
		Logger: logx.WithContext(ctx),
	}
}

// 批量查询用户
func (l *GetUsersLogic) GetUsers(in *user.GetUsersRequest) (*user.GetUsersResponse, error) {
	ids := in.GetIds()
	users := make([]*user.UserInfo, 0)
	if len(ids) == 0 {
		return &user.GetUsersResponse{Users: users}, nil
	}
	if len(ids) > 100 {
		return nil, status.Error(codes.InvalidArgument, "一次最多查询100个用户")
	}
	for _, id := range ids {
		if id <= 0 {
			return nil, status.Error(codes.InvalidArgument, "用户ID必须大于0")
		}
	}
	records, err := l.svcCtx.UserModel.FindByIDs(l.ctx, ids)
	if err != nil {
		return nil, status.Error(codes.Internal, "查询用户失败")
	}
	for _, record := range records {
		users = append(users, &user.UserInfo{
			Id:   record.Id,
			Name: record.Name,
		})
	}
	return &user.GetUsersResponse{Users: users}, nil
}
