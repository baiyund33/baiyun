// Code scaffolded by goctl. Safe to edit.
// goctl 1.10.2

package handler

import (
	"context"
	"errors"
	"net"
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
		//把已验证的用户 ID 放入上下文，让后面的业务逻辑知道当前是谁在连接。
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
		// 写出握手响应 当前握手请求 不额外添加自定义握手响应头
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			// Upgrade 已处理握手失败响应，不再写 HTTP 响应。
			return
		}
		defer conn.Close()

		// 限制单条消息大小，最多64 KiB。
		conn.SetReadLimit(64 * 1024)

		// 收到心跳回应，延长连接的等待时间。
		conn.SetPongHandler(func(string) error {
			return conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		})

		// 通知后台心跳任务：连接已经结束。
		done := make(chan struct{})
		defer close(done)

		// 后台定期发送心跳，不阻塞下面的消息读取。
		go func() {
			ticker := time.NewTicker(20 * time.Second)
			defer ticker.Stop() // 心跳 goroutine 退出时，`ticker.Stop()` 停止定时器，释放相关资源。

			for {
				select {
				case <-ticker.C:
					//
					err := conn.WriteControl(
						websocket.PingMessage,
						nil,
						time.Now().Add(10*time.Second),
					)
					if err != nil {
						conn.Close()
						return
					}
				// `chan struct{}` 不传业务数据，只用来通知：“这个连接已经结束”。
				case <-done:
					return
				}
			}
		}()

		for {
			// 60秒未收到消息或心跳回应，则释放连接。
			if err := conn.SetReadDeadline(time.Now().Add(60 * time.Second)); err != nil {
				return
			}

			messageType, message, err := conn.ReadMessage()
			if err != nil {
				var netErr net.Error
				if errors.As(err, &netErr) && netErr.Timeout() {
					// 超时后尽力通知客户端，再释放连接。
					_ = conn.WriteControl(
						websocket.CloseMessage,
						websocket.FormatCloseMessage(
							websocket.CloseGoingAway,
							"连接超时",
						),
						time.Now().Add(3*time.Second),
					)
				}
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
