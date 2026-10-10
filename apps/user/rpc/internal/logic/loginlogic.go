package logic

import (
	"baiyun/apps/user/rpc/models"
	"context"
	"errors"
	"strings"

	"baiyun/apps/user/rpc/internal/svc"
	"baiyun/apps/user/rpc/user"

	"github.com/zeromicro/go-zero/core/logx"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type LoginLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
	logx.Logger
}

func NewLoginLogic(ctx context.Context, svcCtx *svc.ServiceContext) *LoginLogic {
	return &LoginLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
		Logger: logx.WithContext(ctx),
	}
}

func (l *LoginLogic) Login(in *user.LoginRequest) (*user.LoginResponse, error) {
	Phone := strings.TrimSpace(in.GetPhone())
	Password := in.GetPassword()
	if strings.ContainsAny(Password, " \t\r\n") {
		return nil, status.Error(codes.InvalidArgument, "密码不能包含空格、制表符或换行")
	}
	if Phone == "" {
		return nil, status.Error(codes.InvalidArgument, "phone 不能为空")
	}
	if Password == "" {
		return nil, status.Error(codes.InvalidArgument, "password 不能为空")
	}
	u, err := l.svcCtx.UserModel.FindOneByPhone(l.ctx, Phone)
	if errors.Is(err, models.ErrNotFound) {
		return nil, status.Error(codes.Unauthenticated, "手机号或密码错误")
	}
	if err != nil {
		return nil, status.Error(codes.Internal, "登录失败")
	}
	if err := bcrypt.CompareHashAndPassword(
		[]byte(u.PasswordHash),
		[]byte(Password),
	); err != nil {
		return nil, status.Error(codes.Unauthenticated, "手机号或密码错误")
	}
	return &user.LoginResponse{
		Id:   u.Id,
		Name: u.Name,
	}, nil
}
