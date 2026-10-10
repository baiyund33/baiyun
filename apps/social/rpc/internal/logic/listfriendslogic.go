package logic

import (
	"baiyun/apps/user/rpc/userclient"
	"context"

	"baiyun/apps/social/rpc/internal/svc"
	"baiyun/apps/social/rpc/social"

	"github.com/zeromicro/go-zero/core/logx"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// 获取好友列表
type ListFriendsLogic struct {
	ctx    context.Context
	svcCtx *svc.ServiceContext
	logx.Logger
}

func NewListFriendsLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ListFriendsLogic {
	return &ListFriendsLogic{
		ctx:    ctx,
		svcCtx: svcCtx,
		Logger: logx.WithContext(ctx),
	}
}

func (l *ListFriendsLogic) ListFriends(in *social.ListFriendsRequest) (*social.ListFriendsResponse, error) {
	//API 的 ctx 不会自动通过网络传到 RPC
	userId := in.GetUserId()
	if userId <= 0 {
		return nil, status.Error(codes.InvalidArgument, "用户ID必须大于0")
	}
	page := int64(in.GetPage())
	pageSize := int64(in.GetPageSize())
	if page == 0 {
		page = 1
	}
	if pageSize == 0 {
		pageSize = 20
	}

	if page < 1 || pageSize < 1 || pageSize > 100 {
		return nil, status.Error(codes.InvalidArgument, "页码必须大于0，每页数量为1到100")
	}
	model := l.svcCtx.FriendModel
	total, err := model.CountByUserID(l.ctx, userId)
	if err != nil {
		return nil, status.Error(codes.Internal, "获取好友数量失败")
	}
	offset := (page - 1) * pageSize
	records, err := model.FindByUserID(l.ctx, userId, pageSize, offset)
	if err != nil {
		return nil, status.Error(codes.Internal, "查询好友列表失败")
	}
	userIds := make([]int64, 0)
	for _, record := range records {
		userIds = append(userIds, record.FriendUserId)
	}
	nameMap, err := l.getFriendNames(userIds)
	if err != nil {
		return nil, err
	}
	list := make([]*social.FriendInfo, 0, len(records))
	for _, record := range records {
		name, exists := nameMap[record.FriendUserId]
		if !exists {
			name = "用户不存在"
		}
		list = append(list, &social.FriendInfo{
			Id:           record.Id,
			FriendUserId: record.FriendUserId,
			Name:         name,
			CreatedAt:    record.CreatedAt.Unix(),
		})
	}
	return &social.ListFriendsResponse{
		List:  list,
		Total: total,
	}, nil
}

// 通过RPC获取好友的昵称信息,不使用单条查，因为单条查只能在循环中调用，效率低下
func (l *ListFriendsLogic) getFriendNames(friendUserIds []int64) (map[int64]string, error) {
	nameMap := make(map[int64]string, len(friendUserIds))
	if len(friendUserIds) == 0 {
		return nameMap, nil
	}
	users, err := l.svcCtx.UserRpc.GetUsers(l.ctx, &userclient.GetUsersRequest{Ids: friendUserIds})
	if err != nil {
		// 错误会沿着 辅助方法 → 好友 RPC → API → 前端 传递，不需要每一层重新包装。
		return nil, err
	}

	for _, u := range users.Users {
		nameMap[u.Id] = u.Name
	}
	return nameMap, nil
}
