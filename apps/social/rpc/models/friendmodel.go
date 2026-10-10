package models

import (
	"context"
	"fmt"

	"github.com/zeromicro/go-zero/core/stores/sqlx"
)

var _ FriendModel = (*customFriendModel)(nil)

type (
	// FriendModel is an interface to be customized, add more methods here,
	// and implement the added methods in customFriendModel.
	FriendModel interface {
		friendModel
		withSession(session sqlx.Session) FriendModel

		CreatePair(ctx context.Context, session sqlx.Session, userA, userB int64) error

		// 分页查询某用户的好友关系。
		FindByUserID(ctx context.Context, userID, limit, offset int64) ([]*Friend, error)

		// 统计该用户的好友数量。
		CountByUserID(ctx context.Context, userID int64) (int64, error)

		// 单向删除好友，返回是否实际删除了一条记录。
		DeleteByUserID(ctx context.Context, userID, friendUserID int64) (bool, error)
	}

	customFriendModel struct {
		*defaultFriendModel
	}
)

// NewFriendModel returns a model for the database table.
func NewFriendModel(conn sqlx.SqlConn) FriendModel {
	return &customFriendModel{
		defaultFriendModel: newFriendModel(conn),
	}
}

// 建立双方好友关系，已存在的关系保持不变。
func (m *customFriendModel) CreatePair(
	ctx context.Context,
	session sqlx.Session,
	userA, userB int64,
) error {
	// 固定双向关系的写入顺序，降低并发死锁风险。
	if userA > userB {
		userA, userB = userB, userA
	}

	query := fmt.Sprintf(
		"insert into %s (`user_id`, `friend_user_id`) "+
			"values (?, ?), (?, ?) "+
			"on duplicate key update `id` = `id`", // 已存在的好友关系保持不变。
		m.table,
	)

	_, err := session.ExecCtx(ctx, query, userA, userB, userB, userA)
	return err
}

// 分页查询某用户的好友列表
func (m *customFriendModel) FindByUserID(ctx context.Context, userID, limit, offset int64) ([]*Friend, error) {
	query := fmt.Sprintf(
		"select %s from %s where `user_id` = ? order by `id` desc limit ? offset ?",
		friendRows, m.table,
	)
	friends := make([]*Friend, 0)
	err := m.conn.QueryRowsCtx(ctx, &friends, query, userID, limit, offset)
	return friends, err
}

// 统计该用户的好友数量。
func (m *customFriendModel) CountByUserID(ctx context.Context, userID int64) (int64, error) {
	query := fmt.Sprintf(
		"select count(*) from %s where `user_id` = ?",
		m.table,
	)
	var total int64
	err := m.conn.QueryRowCtx(ctx, &total, query, userID)
	if err != nil {
		return 0, err
	}
	return total, nil
}

func (m *customFriendModel) DeleteByUserID(ctx context.Context, userID, friendUserID int64) (bool, error) {

	query := fmt.Sprintf(
		"delete from %s where `user_id` = ? and `friend_user_id` = ?",
		m.table,
	)
	result, err := m.conn.ExecCtx(ctx, query, userID, friendUserID)
	if err != nil {
		return false, err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return false, err
	}
	return rowsAffected == 1, nil
}

func (m *customFriendModel) withSession(session sqlx.Session) FriendModel {
	return NewFriendModel(sqlx.NewSqlConnFromSession(session))
}
