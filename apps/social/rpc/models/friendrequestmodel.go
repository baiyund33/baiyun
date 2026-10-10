package models

import (
	"context"
	"fmt"

	"github.com/zeromicro/go-zero/core/stores/sqlx"
)

var _ FriendRequestModel = (*customFriendRequestModel)(nil)

type (
	// FriendRequestModel is an interface to be customized, add more methods here,
	// and implement the added methods in customFriendRequestModel.
	FriendRequestModel interface {
		friendRequestModel
		withSession(session sqlx.Session) FriendRequestModel
		// Reopen(ctx context.Context, id int64, message string) (bool, error)

		Reopen(ctx context.Context, id, expectedStatus int64, message string) (bool, error)

		FindReceived(ctx context.Context, userId, limit, offset int64) ([]*FriendRequest, error)
		CountReceived(ctx context.Context, userId int64) (int64, error)

		UpdatePendingStatus(ctx context.Context, session sqlx.Session, id, userId, status int64) (bool, error)
	}

	customFriendRequestModel struct {
		*defaultFriendRequestModel
	}
)

// NewFriendRequestModel returns a model for the database table.
func NewFriendRequestModel(conn sqlx.SqlConn) FriendRequestModel {
	return &customFriendRequestModel{
		defaultFriendRequestModel: newFriendRequestModel(conn),
	}
}

// 只有状态仍与查询时一致，才能重新提交申请。
func (m *customFriendRequestModel) Reopen(ctx context.Context, id, expectedStatus int64, message string) (bool, error) {
	query := fmt.Sprintf(
		"update %s set `message` = ?, `status` = 0 "+
			"where `id` = ? and `status` = ?",
		m.table,
	) //"update friend_request set `message` = ?, `status` = 0 where `id` = ? and `status` = ?"
	// 同意了但是删除了好友关系的可以再次提交好友申请，1，2
	result, err := m.conn.ExecCtx(ctx, query, message, id, expectedStatus)
	if err != nil {
		return false, err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return false, err
	}
	return rows == 1, nil //表示成功修改了一条记录，返回true，否则返回false，bool可以直接表达“是否成功重新申请”：
}

// FindReceived 查询指定用户收到的好友申请列表。
// 结果按 updated_at 降序排列，最新更新的申请在前；若时间相同，则按 id 降序排列。
// limit 和 offset 用于分页查询；返回值为该用户收到的申请列表
func (m *customFriendRequestModel) FindReceived(
	ctx context.Context, userId, limit, offset int64) ([]*FriendRequest, error) {
	//friendRequestRows,默认为表的全部字段
	//select `id`,`from_user_id`,`to_user_id`,`message`,`status`,`created_at`,`updated_at`
	//from `friend_request`
	//where `to_user_id` = ?
	//order by `updated_at` desc, `id` desc
	//limit ? offset ?
	query := fmt.Sprintf("select %s from %s where `to_user_id` = ? "+
		"order by `updated_at` desc, `id` desc limit ? offset ?",
		friendRequestRows, m.table)
	list := make([]*FriendRequest, 0) //初始化为一个空的切片，避免返回nil，容量为0，长度为0
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

// 只允许接收人处理待处理申请的数据库方法。
func (m *customFriendRequestModel) UpdatePendingStatus(
	ctx context.Context,
	session sqlx.Session,
	id, userId, status int64,
) (bool, error) {
	query := fmt.Sprintf(
		"update %s set `status` = ? where `id` = ? and `to_user_id` = ? and `status` = 0",
		m.table,
	)
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

func (m *customFriendRequestModel) withSession(session sqlx.Session) FriendRequestModel {
	return NewFriendRequestModel(sqlx.NewSqlConnFromSession(session))
}
