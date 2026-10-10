package logic

import (
	"baiyun/apps/social/rpc/models"
	"context"
	"errors"

	"baiyun/apps/social/rpc/internal/svc"
	"baiyun/apps/social/rpc/social"

	"github.com/zeromicro/go-zero/core/logx"
	"github.com/zeromicro/go-zero/core/stores/sqlx"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type HandleFriendApplicationLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
	logx.Logger
}

func NewHandleFriendApplicationLogic(ctx context.Context, svcCtx *svc.ServiceContext) *HandleFriendApplicationLogic {
	return &HandleFriendApplicationLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
		Logger: logx.WithContext(ctx),
	}
}

func (l *HandleFriendApplicationLogic) HandleFriendApplication(in *social.HandleFriendApplicationRequest) (*social.HandleFriendApplicationResponse, error) {
	id := in.GetId()
	userId := in.GetUserId()
	targetStatus := in.GetStatus()
	if id <= 0 || userId <= 0 {
		return nil, status.Error(codes.InvalidArgument, "申请ID和用户ID必须大于0")
	}
	if targetStatus != 1 && targetStatus != 2 {
		return nil, status.Error(codes.InvalidArgument, "只允许同意或拒绝")
	}

	model := l.svcCtx.FriendRequestModel
	record, err := model.FindOne(l.ctx, id)
	if errors.Is(err, models.ErrNotFound) {
		return nil, status.Error(codes.NotFound, "好友申请不存在")
	}
	if err != nil {
		return nil, status.Error(codes.Internal, "查找好友申请失败")
	}
	if record.ToUserId != userId {
		return nil, status.Error(codes.PermissionDenied, "只能处理发给自己的申请")
	}
	if record.Status != 0 {
		return nil, status.Error(codes.FailedPrecondition, "申请已处理")
	}

	err = l.svcCtx.MysqlConn.TransactCtx(
		l.ctx,
		func(ctx context.Context, session sqlx.Session) error {
			// 第一步：修改申请状态。
			updated, err := l.svcCtx.FriendRequestModel.UpdatePendingStatus(
				ctx, session, id, userId, int64(targetStatus),
			)
			if err != nil {
				return err
			}
			if !updated {
				return status.Error(codes.Aborted, "申请状态已变化，请刷新")
			}

			// 第二步：接受时建立关系；拒绝时不建立。
			if targetStatus == 1 {
				return l.svcCtx.FriendModel.CreatePair(
					ctx, session, record.FromUserId, record.ToUserId,
				)
			}
			return nil
		},
	)

	if err != nil {
		// 如果 err 已经是 gRPC 状态错误，就直接返回，保留原来的错误码和提示。
		if _, ok := status.FromError(err); ok {
			return nil, err
		}
		return nil, status.Error(codes.Internal, "处理好友申请失败")
	}
	return &social.HandleFriendApplicationResponse{
		Id:     id,
		Status: targetStatus,
	}, nil
}
