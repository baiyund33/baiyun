#### 1.在 [social.proto](E:/code/baiyun/apps/social/rpc/social.proto) 中，`service social` 外增加：

```proto
// 查询收到的好友申请。
message ListFriendApplicationsRequest {
  int64 user_id = 1;   // 接收人，后续由 API 从 JWT 获取。
  int32 page = 2;      // 页码，从 1 开始。
  int32 page_size = 3; // 每页数量。
}

// 一条好友申请记录。
message FriendApplication {
  int64 id = 1;
  int64 from_user_id = 2;
  string message = 3;
  int32 status = 4;     // 0待处理、1已接受、2已拒绝。
  int64 created_at = 5; // Unix 时间戳，单位秒。
  int64 updated_at = 6;
}

message ListFriendApplicationsResponse {
  repeated FriendApplication list = 1; // 申请列表。
  int64 total = 2;                     // 总记录数。
}
```

在已有的 `service social` 内增加：

```
rpc ListFriendApplications(ListFriendApplicationsRequest)
    returns (ListFriendApplicationsResponse);
```

保存后，在项目根目录执行：

```
goctl rpc protoc apps/social/rpc/social.proto --go_out=apps/social/rpc --go-grpc_out=apps/social/rpc --zrpc_out=apps/social/rpc --name-from-filename
```

#### 2.在model中增加方法
在 [friendrequestmodel.go](E:/code/baiyun/apps/social/rpc/models/friendrequestmodel.go) 增加**查询收到的申请、统计数量**两个方法。

在 `FriendRequestModel` 接口内增加：

```
FindReceived(ctx context.Context, userId, limit, offset int64) ([]*FriendRequest, error)
CountReceived(ctx context.Context, userId int64) (int64, error)
```

在接口外增加实现，已有 `context`、`fmt` 导入可直接使用：

```go
// 分页查询收到的申请，最近更新的排在前面。
func (m *customFriendRequestModel) FindReceived(
	ctx context.Context, userId, limit, offset int64,
) ([]*FriendRequest, error) {
	query := fmt.Sprintf(
		"select %s from %s where `to_user_id` = ? "+
			"order by `updated_at` desc, `id` desc limit ? offset ?",
		friendRequestRows, m.table,
	)

	list := make([]*FriendRequest, 0)
	err := m.conn.QueryRowsCtx(ctx, &list, query, userId, limit, offset)
	if err != nil {
		return nil, err
	}
	return list, nil
}

// 统计收到的申请总数。
func (m *customFriendRequestModel) CountReceived(
	ctx context.Context, userId int64,
) (int64, error) {
	query := fmt.Sprintf(
		"select count(*) from %s where `to_user_id` = ?",
		m.table,
	)

	var total int64
	err := m.conn.QueryRowCtx(ctx, &total, query, userId)
	if err != nil {
		return 0, err
	}
	return total, nil
}
```

参数含义：

|参数|作用|
|---|---|
|`userId`|接收申请的用户 ID|
|`limit`|本页最多返回多少条|
|`offset`|跳过多少条，计算方式为 `(页码 - 1) × 每页数量`|
#### 3.实现 [listfriendapplicationslogic.go](E:/code/baiyun/apps/social/rpc/internal/logic/listfriendapplicationslogic.go)。


增加导入：

```
"google.golang.org/grpc/codes"
"google.golang.org/grpc/status"
```

替换方法内容：

```go
func (l *ListFriendApplicationsLogic) ListFriendApplications(
	in *social.ListFriendApplicationsRequest,
) (*social.ListFriendApplicationsResponse, error) {
	userId := in.GetUserId()
	if userId <= 0 {
		return nil, status.Error(codes.InvalidArgument, "用户ID必须大于0")
	}

	page := int64(in.GetPage())
	pageSize := int64(in.GetPageSize())

	// 未传分页参数时使用默认值。
	if page == 0 {
		page = 1
	}
	if pageSize == 0 {
		pageSize = 20
	}
	if page < 1 || pageSize < 1 || pageSize > 100 {
		return nil, status.Error(codes.InvalidArgument, "页码必须大于0，每页数量为1到100")
	}

	model := l.svcCtx.FriendRequestModel

	total, err := model.CountReceived(l.ctx, userId)
	if err != nil {
		return nil, status.Error(codes.Internal, "统计好友申请失败")
	}

	offset := (page - 1) * pageSize
	records, err := model.FindReceived(l.ctx, userId, pageSize, offset)
	if err != nil {
		return nil, status.Error(codes.Internal, "查询好友申请失败")
	}

	// 将数据库结构体转换为 RPC 响应消息。
	list := make([]*social.FriendApplication, 0, len(records))
	for _, record := range records {
		list = append(list, &social.FriendApplication{
			Id:         record.Id,
			FromUserId: record.FromUserId,
			Message:    record.Message,
			Status:     int32(record.Status),
			CreatedAt:  record.CreatedAt.Unix(),
			UpdatedAt:  record.UpdatedAt.Unix(),
		})
	}

	return &social.ListFriendApplicationsResponse{
		List:  list,
		Total: total,
	}, nil
}
```

