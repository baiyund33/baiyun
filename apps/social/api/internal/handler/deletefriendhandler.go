// Code scaffolded by goctl. Safe to edit.
// goctl 1.10.2

package handler

import (
	"net/http"

	"baiyun/apps/social/api/internal/logic"
	"baiyun/apps/social/api/internal/svc"
	"baiyun/apps/social/api/internal/types"
	"github.com/zeromicro/go-zero/rest/httpx"
)

func deleteFriendHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.DeleteFriendReq
		if err := httpx.Parse(r, &req); err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		l := logic.NewDeleteFriendLogic(r.Context(), svcCtx)
		resp, err := l.DeleteFriend(&req)
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
		} else {
			httpx.OkJsonCtx(r.Context(), w, resp)
		}
	}
}
