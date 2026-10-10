package logic

import (
	"baiyun/apps/user/rpc/models"
	"context"
	"errors"

	"baiyun/apps/user/rpc/internal/svc"
	"baiyun/apps/user/rpc/user"

	"github.com/zeromicro/go-zero/core/logx"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type DeleteUserLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
	logx.Logger
}

func NewDeleteUserLogic(ctx context.Context, svcCtx *svc.ServiceContext) *DeleteUserLogic {
	return &DeleteUserLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
		Logger: logx.WithContext(ctx),
	}
}

func (l *DeleteUserLogic) DeleteUser(in *user.DeleteUserRequest) (*user.DeleteUserResponse, error) {
	if in.GetId() <= 0 {
		return nil, status.Error(codes.InvalidArgument, "id 不能小于等于 0")
	}

	err := l.svcCtx.UserModel.Delete(l.ctx, in.GetId())
	if errors.Is(err, models.ErrNotFound) {
		return nil, status.Error(codes.NotFound, "用户不存在")
	}
	if err != nil {
		return nil, err
	}
	return &user.DeleteUserResponse{Id: in.GetId()}, nil
}
