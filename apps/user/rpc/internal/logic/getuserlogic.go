package logic

import (
	"baiyun/apps/user/rpc/internal/svc"
	"baiyun/apps/user/rpc/models"
	"baiyun/apps/user/rpc/user"
	"context"
	"errors"

	"github.com/zeromicro/go-zero/core/logx"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type GetUserLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
	logx.Logger
}

func NewGetUserLogic(ctx context.Context, svcCtx *svc.ServiceContext) *GetUserLogic {
	return &GetUserLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
		Logger: logx.WithContext(ctx),
	}
}

func (l *GetUserLogic) GetUser(in *user.GetUserRequest) (*user.GetUserResponse, error) {
	id := in.GetId()
	if id <= 0 {
		return nil, status.Error(codes.InvalidArgument, "用户ID必须大于0")
	}
	u, err := l.svcCtx.UserModel.FindOne(l.ctx, id)
	if errors.Is(err, models.ErrNotFound) {
		return nil, status.Error(codes.NotFound, "用户不存在")
	}
	if err != nil {
		return nil, status.Error(codes.Internal, "查询用户失败")
	}

	return &user.GetUserResponse{
		Id:   u.Id,
		Name: u.Name,
	}, nil
}
