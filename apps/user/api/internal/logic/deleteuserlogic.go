// Code scaffolded by goctl. Safe to edit.
// goctl 1.10.2

package logic

import (
	"baiyun/apps/user/rpc/userclient"
	"context"
	"strconv"

	"baiyun/apps/user/api/internal/svc"
	"baiyun/apps/user/api/internal/types"

	"github.com/zeromicro/go-zero/core/logx"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type DeleteUserLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewDeleteUserLogic(ctx context.Context, svcCtx *svc.ServiceContext) *DeleteUserLogic {
	return &DeleteUserLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *DeleteUserLogic) DeleteUser(req *types.DeleteUserReq) (resp *types.DeleteUserResp, err error) {
	userId, ok := l.ctx.Value("userId").(string)
	if !ok || userId == "" {
		return nil, status.Error(codes.Unauthenticated, "请先登录")
	}
	if userId != strconv.FormatInt(req.Id, 10) {
		return nil, status.Error(codes.PermissionDenied, "只能操作本人账户")
	}
	result, err := l.svcCtx.UserRpc.DeleteUser(l.ctx, &userclient.DeleteUserRequest{
		Id: req.Id,
	})

	if err != nil {
		return nil, err
	}
	return &types.DeleteUserResp{
		Id: result.Id,
	}, nil
}
