| 方法                    | 用途              |
| --------------------- | --------------- |
| `ExecCtx`             | 新增、修改、删除数据      |
| `QueryRowCtx`         | 查询一条记录或单个值，例如数量 |
| `QueryRowsCtx`        | 查询多条记录          |
| `QueryRowPartialCtx`  | 查询一条记录的部分字段     |
| `QueryRowsPartialCtx` | 查询多条记录的部分字段     |
| `TransactCtx`         | 执行事务            |
你项目中的 `User` 有 `Id`、`Name`、`Phone`、`PasswordHash`、`CreatedAt`、`UpdatedAt` 六个字段。下面只查询前三个。

#### **1. `QueryRowPartialCtx`：查询一个用户**

示例方法可以写在自定义的 `usermodel.go` 中：

```go
func (m *customUserModel) FindBasicByID(
	ctx context.Context, id int64,
) (*User, error) {
	query := fmt.Sprintf(
		"select `id`, `name`, `phone` from %s where `id` = ? limit 1",
		m.table,
	)

	var user User
	err := m.conn.QueryRowPartialCtx(ctx, &user, query, id)
	switch err {
	case nil:
		return &user, nil
	case sqlx.ErrNotFound:
		return nil, ErrNotFound
	default:
		return nil, err
	}
}
```

这里：

- `&user`：把查询结果写入这个结构体。
- `id`：替换 SQL 中的 `?`，作为查询参数。
- 通过 `db` 标签，把 `id`、`name`、`phone` 映射到相应字段。
- `user` 是新声明的变量，所以未查询的 `PasswordHash` 为 `""`，时间字段为零值。
- 没找到用户时返回 `ErrNotFound`。

#### **2. `QueryRowsPartialCtx`：查询多个用户**

```go
func (m *customUserModel) ListBasic(
	ctx context.Context,
) ([]*User, error) {
	query := fmt.Sprintf(
		"select `id`, `name`, `phone` from %s order by `id` desc limit ?",
		m.table,
	)

	users := make([]*User, 0)
	err := m.conn.QueryRowsPartialCtx(ctx, &users, query, 20)
	if err != nil {
		return nil, err
	}

	return users, nil
}
```

这里 `&users` 是**切片的指针**，用于接收多行结果。每条记录对应一个 `User`，最多查询 20 条。没有匹配记录时，成功返回空切片。

可以这样记：

```
// 单行：传结构体指针。
QueryRowPartialCtx(ctx, &user, query, args...)

// 多行：传切片指针。
QueryRowsPartialCtx(ctx, &users, query, args...)
```

**注意：这些示例得到的是部分字段的 User。不要直接调用生成的 `Update(ctx, user)`，因为它会更新全部业务字段，可能把未查询的密码哈希写成空字符串。**

#### 3.执行事务
```go
func (m *customFriendModel) CreatePairWithTransaction(
	ctx context.Context,
	userA, userB int64,
) error {
	if userA > userB {
		userA, userB = userB, userA
	}

	err := m.conn.TransactCtx(
		ctx,
		func(ctx context.Context, session sqlx.Session) error {
			query := fmt.Sprintf(
				"insert into %s (`user_id`, `friend_user_id`) values (?, ?)",
				m.table,
			)

			// 创建 A → B，失败则回滚。
			_, err := session.ExecCtx(ctx, query, userA, userB)
			if err != nil {
				return err
			}

			// 创建 B → A，失败则回滚。
			_, err = session.ExecCtx(ctx, query, userB, userA)
			if err != nil {
				return err
			}

			// 回调返回 nil，TransactCtx 尝试提交事务。
			return nil
		},
	)

	// 包括事务内执行失败和提交失败。
	if err != nil {
		return err
	}

	return nil
}
```