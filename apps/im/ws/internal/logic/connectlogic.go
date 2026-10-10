// Code scaffolded by goctl. Safe to edit.
// goctl 1.10.2

package logic

import (
	"context"

	"baiyun/apps/im/ws/internal/svc"
	"github.com/zeromicro/go-zero/core/logx"
)

type ConnectLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewConnectLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ConnectLogic {
	return &ConnectLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ConnectLogic) Connect() error {
	// todo: add your logic here and delete this line

	return nil
}
