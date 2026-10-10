#### 1.开始。**先建立好友关系表**，接受申请后才能保存“双方已经是好友”。

流程规则：

|操作|数据库变化|
|---|---|
|接受|申请状态改为 `1`，同时建立双方好友关系|
|拒绝|申请状态改为 `2`|
|权限|只有接收人可以处理，且申请必须处于待处理状态|

接受操作需要**数据库事务**：修改状态和建立关系一起成功，任何一步失败都回滚。

第一步，创建：

`E:\code\baiyun\apps\social\rpc\models\friend.sql`

```sql
CREATE TABLE IF NOT EXISTS `friend` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `friend_user_id` BIGINT NOT NULL COMMENT '好友ID',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_friend` (`user_id`, `friend_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

例如用户 `16` 和 `17` 成为好友，会保存两行：

```
user_id    friend_user_id
16         17
17         16
```

保存后，在项目根目录生成 Model：

```
goctl model mysql ddl -src apps/social/rpc/models/friend.sql -dir apps/social/rpc/models
```

并在**好友服务连接的数据库**中执行该 SQL

#### 2.下一步在 [social.proto](E:/code/baiyun/apps/social/rpc/social.proto) 增加：

```proto
// 接受或拒绝好友申请。
message HandleFriendApplicationRequest {
  int64 id = 1;      // 申请记录ID。
  int64 user_id = 2; // 操作人，由 API 从 JWT 获取。
  int32 status = 3;  // 1接受、2拒绝，只允许这两个值。
}

message HandleFriendApplicationResponse {
  int64 id = 1;
  int32 status = 2;
}
```

在已有的 `service social` 内增加：

```
rpc HandleFriendApplication(HandleFriendApplicationRequest)
    returns (HandleFriendApplicationResponse);
```

保存后在项目根目录执行：

```
goctl rpc protoc apps/social/rpc/social.proto --go_out=apps/social/rpc --go-grpc_out=apps/social/rpc --zrpc_out=apps/social/rpc --name-from-filename
```

#### 3.初始化好友关系 Model。

在 [servicecontext.go](E:/code/baiyun/apps/social/rpc/internal/svc/servicecontext.go) 的 `ServiceContext` 中增加：

```
FriendModel models.FriendModel
```

在 `NewServiceContext` 的返回结构体中增加：

```
FriendModel: models.NewFriendModel(conn),
```

它与 `FriendRequestModel` 复用同一个数据库连接：

```
FriendRequestModel: models.NewFriendRequestModel(conn),
FriendModel:        models.NewFriendModel(conn),
```


#### 4.增加**只允许接收人处理待处理申请**的数据库方法。

在 [friendrequestmodel.go](E:/code/baiyun/apps/social/rpc/models/friendrequestmodel.go) 的 `FriendRequestModel` 接口中增加：

```go
UpdatePendingStatus(
	ctx context.Context,
	session sqlx.Session,
	id, userId, status int64,
) (bool, error)
```

在接口外增加实现，现有导入够用：

```go
// 只有接收人能将待处理申请改为接受或拒绝。
func (m *customFriendRequestModel) UpdatePendingStatus(
	ctx context.Context,
	session sqlx.Session,
	id, userId, status int64,
) (bool, error) {
	query := fmt.Sprintf(
		"update %s set `status` = ? "+
			"where `id` = ? and `to_user_id` = ? and `status` = 0",
		m.table,
	)

	// 传入事务时使用事务，否则使用普通连接。
	if session == nil {
		session = m.conn
	}

	result, err := session.ExecCtx(ctx, query, status, id, userId)
	if err != nil {
		return false, err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return false, err
	}
	return rows == 1, nil
}
```

SQL 中三个条件的作用：

|条件|作用|
|---|---|
|`id = ?`|指定申请记录|
|`to_user_id = ?`|确保操作人是接收人|
|`status = 0`|确保尚未处理，防止并发重复操作|

`session` 是**数据库事务会话**。接受时要用同一个事务修改申请状态、插入好友关系，才能一起提交或回滚。


#### 5.实现 handlefriendapplicationlogic.go

增加导入，保留已有导入：

```go
"baiyun/apps/social/rpc/models"
"errors"

"github.com/go-sql-driver/mysql"
"github.com/zeromicro/go-zero/core/stores/sqlx"
"google.golang.org/grpc/codes"
"google.golang.org/grpc/status"
```

替换方法：

```go
func (l *HandleFriendApplicationLogic) HandleFriendApplication(
	in *social.HandleFriendApplicationRequest,
) (*social.HandleFriendApplicationResponse, error) {
	id := in.GetId()
	userId := in.GetUserId()
	targetStatus := in.GetStatus()

	if id <= 0 || userId <= 0 {
		return nil, status.Error(codes.InvalidArgument, "申请ID和用户ID必须大于0")
	}
	if targetStatus != 1 && targetStatus != 2 {
		return nil, status.Error(codes.InvalidArgument, "只允许接受或拒绝")
	}

	record, err := l.svcCtx.FriendRequestModel.FindOne(l.ctx, id)
	if errors.Is(err, models.ErrNotFound) {
		return nil, status.Error(codes.NotFound, "好友申请不存在")
	}
	if err != nil {
		return nil, status.Error(codes.Internal, "查询好友申请失败")
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
		updated, err := model.UpdatePendingStatus(
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
	if _, ok := status.FromError(err); ok {
		return nil, err
	}
	return nil, status.Error(codes.Internal, "处理好友申请失败")
}

return &social.HandleFriendApplicationResponse{
	Id:     id,
	Status: targetStatus,
}, nil
```

这里**修改申请状态和插入两条好友关系都使用同一个 `session`**。任一步返回错误，事务自动回滚；全部成功才提交。