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

func listFriendApplicationsHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.ListFriendApplicationsReq
		if err := httpx.Parse(r, &req); err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		l := logic.NewListFriendApplicationsLogic(r.Context(), svcCtx)
		resp, err := l.ListFriendApplications(&req)
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
		} else {
			httpx.OkJsonCtx(r.Context(), w, resp)
		}
	}
}
