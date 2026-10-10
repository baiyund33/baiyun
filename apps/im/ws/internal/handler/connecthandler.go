// Code scaffolded by goctl. Safe to edit.
// goctl 1.10.2

package handler

import (
	"net/http"

	"baiyun/apps/im/ws/internal/logic"
	"baiyun/apps/im/ws/internal/svc"
	"github.com/zeromicro/go-zero/rest/httpx"
)

func connectHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		l := logic.NewConnectLogic(r.Context(), svcCtx)
		err := l.Connect()
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
		} else {
			httpx.Ok(w)
		}
	}
}
