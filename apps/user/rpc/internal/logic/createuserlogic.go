package logic

import (
	"baiyun/apps/user/rpc/models"
	"context"

	"baiyun/apps/user/rpc/internal/svc"
	"baiyun/apps/user/rpc/user"

	"github.com/zeromicro/go-zero/core/logx"
)

type CreateUserLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
	logx.Logger
}

func NewCreateUserLogic(ctx context.Context, svcCtx *svc.ServiceContext) *CreateUserLogic {
	return &CreateUserLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
		Logger: logx.WithContext(ctx),
	}
}

func (l *CreateUserLogic) CreateUser(in *user.CreateUserRequest) (*user.CreateUserResponse, error) {
	result, err := l.svcCtx.UserModel.Insert(l.ctx, &models.User{
		Name:  in.Name,
		Phone: in.Phone,
	})
	if err != nil {
		return nil, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}
	return &user.CreateUserResponse{
		Id: id,
	}, nil
}
