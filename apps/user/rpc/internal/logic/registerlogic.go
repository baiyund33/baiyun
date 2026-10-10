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
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type RegisterLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
	logx.Logger
}

func NewRegisterLogic(ctx context.Context, svcCtx *svc.ServiceContext) *RegisterLogic {
	return &RegisterLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
		Logger: logx.WithContext(ctx),
	}
}

func (l *RegisterLogic) Register(in *user.RegisterRequest) (*user.RegisterResponse, error) {
	Name := strings.TrimSpace(in.GetName())
	Phone := strings.TrimSpace(in.GetPhone())
	Password := in.GetPassword()
	if strings.ContainsAny(Password, " \t\r\n") {
		return nil, status.Error(codes.InvalidArgument, "密码不能包含空格、制表符或换行")
	}
	if Name == "" {
		return nil, status.Error(codes.InvalidArgument, "name 不能为空")
	}
	if Phone == "" {
		return nil, status.Error(codes.InvalidArgument, "phone 不能为空")
	}
	if Password == "" {
		return nil, status.Error(codes.InvalidArgument, "password 不能为空")
	}
	if len(Password) > 72 {
		return nil, status.Error(codes.InvalidArgument, "密码不能超过72字节")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, status.Error(codes.Internal, "密码处理失败")
	}

	u, err := l.svcCtx.UserModel.Insert(l.ctx, &models.User{
		Name:         Name,
		Phone:        Phone,
		PasswordHash: string(hash),
	})
	if err != nil {
		var mysqlErr *mysql.MySQLError
		if errors.As(err, &mysqlErr) && mysqlErr.Number == 1062 {
			return nil, status.Error(codes.AlreadyExists, "手机号已注册")
		}
		return nil, status.Error(codes.Internal, "注册失败")
	}

	id, err := u.LastInsertId()
	if err != nil {
		return nil, err
	}

	return &user.RegisterResponse{
		Id: id,
	}, nil
}
