package logic

import (
	"baiyun/apps/social/rpc/models"
	"baiyun/apps/user/rpc/userclient"
	"context"
	"errors"
	"strings"
	"unicode/utf8"

	"baiyun/apps/social/rpc/internal/svc"
	"baiyun/apps/social/rpc/social"

	"github.com/go-sql-driver/mysql"
	"github.com/zeromicro/go-zero/core/logx"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type ApplyFriendLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
	logx.Logger
}

func NewApplyFriendLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ApplyFriendLogic {
	return &ApplyFriendLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
		Logger: logx.WithContext(ctx),
	}
}

// 发送好友申请。
func (l *ApplyFriendLogic) ApplyFriend(in *social.ApplyFriendRequest) (*social.ApplyFriendResponse, error) {
	toID := in.GetToUserId()
	fromID := in.GetFromUserId()
	message := strings.TrimSpace(in.GetMessage())
	if fromID <= 0 || toID <= 0 {
		return nil, status.Error(codes.InvalidArgument, "用户ID必须大于0")
	}
	if fromID == toID {
		return nil, status.Error(codes.InvalidArgument, "不能添加自己为好友")
	}
	if utf8.RuneCountInString(message) > 255 {
		return nil, status.Error(codes.InvalidArgument, "申请附言不能超过255个字符")
	}
	// 检查申请人和目标用户是否存在
	for _, id := range []int64{fromID, toID} {
		_, err := l.svcCtx.UserRpc.GetUser(l.ctx, &userclient.GetUserRequest{Id: id})
		if err != nil {
			if status.Code(err) == codes.NotFound {
				return nil, status.Error(codes.NotFound, "申请人或目标用户不存在")
			}
			return nil, status.Error(codes.Unavailable, "用户服务暂不可用")
		}
	}

	// 只检查自己的好友列表，不检查对方保留的关系。
	_, err := l.svcCtx.FriendModel.FindOneByUserIdFriendUserId(
		l.ctx, fromID, toID,
	)
	// 没找到，就返回ErrNotFound
	if err == nil {
		return nil, status.Error(codes.AlreadyExists, "已经是好友")
	}
	if !errors.Is(err, models.ErrNotFound) {
		return nil, status.Error(codes.Internal, "查询好友关系失败")
	}
	// 检查是否已经存在好友申请
	model := l.svcCtx.FriendRequestModel
	f, err := model.FindOneByFromUserIdToUserId(
		l.ctx,
		fromID,
		toID,
	)
	if err == nil {
		// 本人的好友关系不存在，但已有申请记录，按申请状态决定是否允许重新提交。
		switch f.Status {
		// 0:待处理 1:已接受  2:已拒绝
		case 0:
			return nil, status.Error(codes.AlreadyExists, "好友申请正在等待处理")
		case 1, 2:
			// 本人的好友关系已不存在，允许将已接受或已拒绝的申请重新设为待处理。
			// 传入查询时的状态，避免覆盖其他请求已经修改的状态。
			// 重新提交申请
			updated, err := model.Reopen(l.ctx, f.Id, f.Status, message)
			if err != nil {
				return nil, status.Error(codes.Internal, "重新提交好友申请失败")
			}
			if !updated {
				return nil, status.Error(codes.Aborted, "申请状态已变化，请重试")
			}
			return &social.ApplyFriendResponse{
				Id: f.Id,
			}, nil
		default:
			return nil, status.Error(codes.Internal, "好友申请状态异常")
		}
	}
	// 如果查询好友申请时出现错误，且不是"数据未找到"错误，则返回内部错误。
	if !errors.Is(err, models.ErrNotFound) { //判断 err 是不是除"数据未找到"之外的其他错误。
		return nil, status.Error(codes.Internal, "查询好友申请失败")
	}
	// 如果没有找到现有的好友申请，则创建一个新的好友申请。
	result, err := model.Insert(l.ctx, &models.FriendRequest{
		FromUserId: fromID,
		ToUserId:   toID,
		Message:    message,
		Status:     0,
	})

	if err != nil {
		var mysqlErr *mysql.MySQLError
		if errors.As(err, &mysqlErr) && mysqlErr.Number == 1062 {
			return nil, status.Error(codes.AlreadyExists, "好友申请记录已存在")
		}
		return nil, status.Error(codes.Internal, "发送好友申请失败")
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, status.Error(codes.Internal, "获取好友申请记录ID失败")
	}

	return &social.ApplyFriendResponse{Id: id}, nil
}
