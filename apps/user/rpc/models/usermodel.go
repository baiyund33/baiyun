package models

import (
	"context"
	"fmt"
	"strings"

	"github.com/zeromicro/go-zero/core/stores/sqlx"
)

var _ UserModel = (*customUserModel)(nil)

type (
	// UserModel is an interface to be customized, add more methods here,
	// and implement the added methods in customUserModel.
	UserModel interface {
		userModel
		withSession(session sqlx.Session) UserModel

		UpdateFields(ctx context.Context, id int64, name, phone string) error
		// 批量查询用户
		FindByIDs(ctx context.Context, ids []int64) ([]*User, error)
	}

	customUserModel struct {
		*defaultUserModel
	}
)

// NewUserModel returns a model for the database table.
func NewUserModel(conn sqlx.SqlConn) UserModel {
	return &customUserModel{
		defaultUserModel: newUserModel(conn),
	}
}

func (m *customUserModel) withSession(session sqlx.Session) UserModel {
	return NewUserModel(sqlx.NewSqlConnFromSession(session))
}

func (m *customUserModel) UpdateFields(
	ctx context.Context, id int64, name, phone string,
) error {
	var fields []string
	var args []any

	if name != "" {
		fields = append(fields, "`name` = ?")
		args = append(args, name)
	}
	if phone != "" {
		fields = append(fields, "`phone` = ?")
		args = append(args, phone)
	}

	// 没有需要更新的字段，不执行 SQL。
	if len(fields) == 0 {
		return nil
	}

	args = append(args, id)
	query := fmt.Sprintf(
		"update %s set %s where `id` = ?",
		m.table, strings.Join(fields, ", "),
	)
	_, err := m.conn.ExecCtx(ctx, query, args...)
	return err
}

func (m *customUserModel) FindByIDs(ctx context.Context, ids []int64) ([]*User, error) {
	records := make([]*User, 0)
	if len(ids) == 0 {
		return records, nil
	}
	// 每个 ID 对应一个占位符和一个参数。
	placeholders := make([]string, len(ids))
	args := make([]any, len(ids))
	for i, id := range ids {
		placeholders[i] = "?"
		args[i] = id
	}
	// in 查询中使用占位符，避免 SQL 注入风险。不能传入切片直接作为参数，因为切片会被解析为单个参数，导致 SQL 语法错误。
	query := fmt.Sprintf(
		"select %s from %s where `id` in (%s)",
		userRows, m.table, strings.Join(placeholders, ","),
	)
	err := m.conn.QueryRowsCtx(ctx, &records, query, args...)
	if err != nil {
		return nil, err
	}

	return records, nil
}

func (m *customUserModel) Delete(ctx context.Context, id int64) error {
	query := fmt.Sprintf("delete from %s where `id` = ?", m.table)
	result, err := m.conn.ExecCtx(ctx, query, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}
