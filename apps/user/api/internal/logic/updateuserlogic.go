// Code scaffolded by goctl. Safe to edit.
// goctl 1.10.2

package logic

import (
	"baiyun/apps/user/api/internal/svc"
	"baiyun/apps/user/api/internal/types"
	"baiyun/apps/user/rpc/userclient"
	"context"
	"strconv"

	"github.com/zeromicro/go-zero/core/logx"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type UpdateUserLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewUpdateUserLogic(ctx context.Context, svcCtx *svc.ServiceContext) *UpdateUserLogic {
	return &UpdateUserLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *UpdateUserLogic) UpdateUser(req *types.UpdateUserReq) (resp *types.UpdateUserResp, err error) {
	userId, ok := l.ctx.Value("userId").(string) // 从上下文中获取用户ID,断言
	if !ok || userId == "" {
		return nil, status.Error(codes.Unauthenticated, "请先登录")
	}
	if userId != strconv.FormatInt(req.Id, 10) {
		return nil, status.Error(codes.PermissionDenied, "没有权限修改其他用户信息")
	}
	result, err := l.svcCtx.UserRpc.UpdateUser(l.ctx, &userclient.UpdateUserRequest{
		Id:    req.Id,
		Name:  req.Name,
		Phone: req.Phone,
	})
	if err != nil {
		return nil, err
	}
	return &types.UpdateUserResp{
		Id: result.Id,
	}, nil
}
