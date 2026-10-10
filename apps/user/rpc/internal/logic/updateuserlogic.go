package logic

import (
	"baiyun/apps/user/rpc/models"
	"context"
	"errors"
	"strings"

	"baiyun/apps/user/rpc/internal/svc"
	"baiyun/apps/user/rpc/user"

	"github.com/go-sql-driver/mysql"
	"github.com/zeromicro/go-zero/core/logx"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type UpdateUserLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
	logx.Logger
}

func NewUpdateUserLogic(ctx context.Context, svcCtx *svc.ServiceContext) *UpdateUserLogic {
	return &UpdateUserLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
		Logger: logx.WithContext(ctx),
	}
}

func (l *UpdateUserLogic) UpdateUser(in *user.UpdateUserRequest) (*user.UpdateUserResponse, error) {
	name := strings.TrimSpace(in.GetName())
	phone := strings.TrimSpace(in.GetPhone())
	if in.GetId() <= 0 {
		return nil, status.Error(codes.InvalidArgument, "id 必须大于0")
	}
	u, err := l.svcCtx.UserModel.FindOne(l.ctx, in.GetId())

	if errors.Is(err, models.ErrNotFound) {
		return nil, status.Error(codes.NotFound, "用户不存在")
	}
	if err != nil {
		return nil, err
	}

	if err := l.svcCtx.UserModel.UpdateFields(
		l.ctx, u.Id, name, phone,
	); err != nil {
		var mysqlErr *mysql.MySQLError
		if errors.As(err, &mysqlErr) && mysqlErr.Number == 1062 {
			return nil, status.Error(codes.AlreadyExists, "手机号已被使用")
		}
		return nil, status.Error(codes.Internal, "修改用户失败")
	}
	return &user.UpdateUserResponse{Id: u.Id}, nil
}
