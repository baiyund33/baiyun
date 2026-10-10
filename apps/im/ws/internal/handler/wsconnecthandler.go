// Code scaffolded by goctl. Safe to edit.
// goctl 1.10.2

package handler

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"baiyun/apps/im/ws/internal/logic"
	"baiyun/apps/im/ws/internal/svc"

	"github.com/gorilla/websocket"
	"github.com/zeromicro/go-zero/rest/httpx"
)

func wsConnectHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	upgrader := websocket.Upgrader{
		HandshakeTimeout: 5 * time.Second,

		// 只协商应用协议，不把登录令牌返回给浏览器。
		Subprotocols: []string{"baiyun"},

		// 只允许配置中的浏览器来源建立连接。
		CheckOrigin: func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			for _, allowed := range svcCtx.Config.AllowedOrigins {
				if origin == allowed {
					return true
				}
			}
			return false
		},
	}
	return func(w http.ResponseWriter, r *http.Request) {
		// 建立连接前验证登录身份。
		userID, err := authenticateWS(
			r,
			svcCtx.Config.Auth.AccessSecret,
		)
		if err != nil {
			httpx.WriteJson(w, http.StatusUnauthorized, map[string]string{
				"message": err.Error(),
			})
			return
		}

		// 将已验证的身份交给后续业务逻辑。
		ctx := context.WithValue(
			r.Context(),
			"userId",
			strconv.FormatInt(userID, 10),
		)

		l := logic.NewWsConnectLogic(ctx, svcCtx)
		if err := l.WsConnect(); err != nil {
			httpx.ErrorCtx(ctx, w, err)
			return
		}

		// 将当前 HTTP 连接升级为 WebSocket。
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			// Upgrade 已处理握手失败响应，不再写 HTTP 响应。
			return
		}
		defer conn.Close()

		// 限制单条消息大小，最多64 KiB。
		conn.SetReadLimit(64 * 1024)

		for {
			// 60秒没有收到消息，就退出并释放连接。
			if err := conn.SetReadDeadline(time.Now().Add(60 * time.Second)); err != nil {
				return
			}

			messageType, message, err := conn.ReadMessage()
			if err != nil {
				return
			}

			// 防止对方无法接收时，写操作一直阻塞。
			if err := conn.SetWriteDeadline(time.Now().Add(10 * time.Second)); err != nil {
				return
			}

			// 将消息原样返回给当前连接，暂不转发给其他用户。
			if err := conn.WriteMessage(messageType, message); err != nil {
				return
			}
		}
	}
}
