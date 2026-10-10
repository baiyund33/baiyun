按这个流程实现：**校验参数 → 查询用户 → 检查已有申请 → 新增或重新申请 → 返回 ID**。

你当前将无效 ID 返回 `codes.Internal`，应改为 `codes.InvalidArgument`，因为这是参数错误。

**1. 先接入用户 RPC 客户端**

在好友服务 [config.go](E:/code/baiyun/apps/social/rpc/internal/config/config.go) 的 `Config` 内增加：

```go
UserRpc zrpc.RpcClientConf
```

在 [social.yaml](E:/code/baiyun/apps/social/rpc/etc/social.yaml) 增加，使用与用户服务相同的 etcd：

```yml
UserRpc:
  Etcd:
    Hosts:
      - 你的etcd地址:2379
    Key: user.rpc
```

在 [servicecontext.go](E:/code/baiyun/apps/social/rpc/internal/svc/servicecontext.go) 增加导入：

```go
"baiyun/apps/user/rpc/userclient"
"github.com/zeromicro/go-zero/zrpc"
```

`ServiceContext` 增加字段：

```go
UserRpc userclient.User
```

初始化时增加：

```go
UserRpc: userclient.NewUser(zrpc.MustNewClient(c.UserRpc)),
```

**2. 为“被拒绝后重新申请”增加 Model 方法**
Model 中增加的一般是**数据库访问方法**：查询、新增、修改、删除，以及数据库事务操作。

在 [friendrequestmodel.go](E:/code/baiyun/apps/social/rpc/models/friendrequestmodel.go) 中增加导入：

```go
"context"
"fmt"
```

在 `FriendRequestModel` 接口中增加：

```go
Reopen(ctx context.Context, id int64, message string) (bool, error)
```

然后增加实现：

```go
// 只有申请仍处于已拒绝状态，才能重新提交。
func (m *customFriendRequestModel) Reopen(
	ctx context.Context, id int64, message string,
) (bool, error) {
	query := fmt.Sprintf(
		"update %s set `message` = ?, `status` = 0 "+
			"where `id` = ? and `status` = 2",
		m.table,
	)

	result, err := m.conn.ExecCtx(ctx, query, message, id)
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

`status = 2` 是更新条件，可以防止查询后状态发生变化，却被本次更新覆盖。

**3. 实现 ApplyFriend**

在 [applyfriendlogic.go](E:/code/baiyun/apps/social/rpc/internal/logic/applyfriendlogic.go) 增加导入，保留已有导入：

```go
"baiyun/apps/social/rpc/models"
"baiyun/apps/user/rpc/userclient"
"errors"
"strings"
"unicode/utf8"

"github.com/go-sql-driver/mysql"
```

将 `ApplyFriend` 方法替换为：

```go
func (l *ApplyFriendLogic) ApplyFriend(
	in *social.ApplyFriendRequest,
) (*social.ApplyFriendResponse, error) {
	fromID := in.GetFromUserId()
	toID := in.GetToUserId()
	message := strings.TrimSpace(in.GetMessage())

	// 校验申请双方和附言。
	if fromID <= 0 || toID <= 0 {
		return nil, status.Error(codes.InvalidArgument, "用户ID必须大于0")
	}
	if fromID == toID {
		return nil, status.Error(codes.InvalidArgument, "不能添加自己为好友")
	}
	if utf8.RuneCountInString(message) > 255 {
		return nil, status.Error(codes.InvalidArgument, "申请附言不能超过255个字符")
	}

	// 通过用户服务查询，不直接读取用户表。
	for _, id := range []int64{fromID, toID} {
		_, err := l.svcCtx.UserRpc.GetUser(
			l.ctx, &userclient.GetUserRequest{Id: id},
		)
		if err != nil {
			if status.Code(err) == codes.NotFound {
				return nil, status.Error(codes.NotFound, "申请人或目标用户不存在")
			}
			return nil, status.Error(codes.Unavailable, "用户服务暂不可用")
		}
	}

	model := l.svcCtx.FriendRequestModel
	existing, err := model.FindOneByFromUserIdToUserId(
		l.ctx, fromID, toID,
	)

	if err == nil {
		switch existing.Status {
		case 0:
			return nil, status.Error(codes.AlreadyExists, "好友申请正在等待处理")
		case 1:
			return nil, status.Error(codes.AlreadyExists, "好友申请已接受")
		case 2:
			// 复用被拒绝的记录，重新设为待处理。
			updated, err := model.Reopen(l.ctx, existing.Id, message)
			if err != nil {
				return nil, status.Error(codes.Internal, "重新申请失败")
			}
			if !updated {
				return nil, status.Error(codes.Aborted, "申请状态已变化，请重试")
			}
			return &social.ApplyFriendResponse{Id: existing.Id}, nil
		default:
			return nil, status.Error(codes.Internal, "好友申请状态异常")
		}
	}
	if !errors.Is(err, models.ErrNotFound) {
		return nil, status.Error(codes.Internal, "查询好友申请失败")
	}

	// 首次申请。唯一索引防止并发请求重复插入。
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
		return nil, status.Error(codes.Internal, "获取申请ID失败")
	}

	return &social.ApplyFriendResponse{Id: id}, nil
}
```

这段代码是：**识别 MySQL 唯一索引冲突，将数据库错误转换为“好友申请已存在”。**

```go
var mysqlErr *mysql.MySQLError

if errors.As(err, &mysqlErr) && mysqlErr.Number == 1062 {
	return nil, status.Error(codes.AlreadyExists, "好友申请记录已存在")
}
```

|代码|含义|
|---|---|
|`errors.As(err, &mysqlErr)`|检查 `err` 或其包装的错误是否为 `*mysql.MySQLError`；如果是，将它赋给 `mysqlErr`|
|`mysqlErr.Number == 1062`|判断是否为 MySQL 的重复键错误，即违反主键或唯一索引约束|
|`&&`|两个条件都满足才进入；第一个为假时不会访问 `mysqlErr.Number`|
|`codes.AlreadyExists`|向 RPC 调用方表示“记录已存在”|

这里对应唯一索引：

```
UNIQUE KEY uk_from_to (from_user_id, to_user_id)
```