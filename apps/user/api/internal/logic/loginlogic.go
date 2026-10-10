// Code scaffolded by goctl. Safe to edit.
// goctl 1.10.2

package logic

import (
	"baiyun/apps/user/rpc/userclient"
	"context"
	"errors"
	"strconv"
	"time"

	"baiyun/apps/user/api/internal/svc"
	"baiyun/apps/user/api/internal/types"

	"github.com/golang-jwt/jwt/v4"
	"github.com/zeromicro/go-zero/core/logx"
)

type LoginLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewLoginLogic(ctx context.Context, svcCtx *svc.ServiceContext) *LoginLogic {
	return &LoginLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *LoginLogic) Login(req *types.LoginReq) (resp *types.LoginResp, err error) {
	result, err := l.svcCtx.UserRpc.Login(l.ctx, &userclient.LoginRequest{
		Phone:    req.Phone,
		Password: req.Password,
	})
	if err != nil {
		return nil, err
	}
	now := time.Now().Unix()
	expire := now + l.svcCtx.Config.Auth.AccessExpire
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId": strconv.FormatInt(result.Id, 10),
		"iat":    now,
		"exp":    expire,
	})

	accessToken, err := token.SignedString(
		[]byte(l.svcCtx.Config.Auth.AccessSecret),
	)
	if err != nil {
		return nil, errors.New("令牌生成失败")
	}

	return &types.LoginResp{
		Id:           result.Id,
		Name:         result.Name,
		AccessToken:  accessToken,
		AccessExpire: expire,
	}, nil
}
