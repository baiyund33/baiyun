package handler

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"github.com/gorilla/websocket"
)

func authenticateWS(r *http.Request, secret string) (int64, error) {
	// 浏览器通过子协议传入两项：baiyun、登录令牌。
	protocols := websocket.Subprotocols(r)
	if len(protocols) != 2 || protocols[0] != "baiyun" {
		return 0, errors.New("请先登录")
	}

	// 验证签名，限定使用登录接口相同的 HS256 算法。
	token, err := jwt.Parse(
		protocols[1],
		func(token *jwt.Token) (any, error) {
			return []byte(secret), nil
		},
		jwt.WithValidMethods([]string{"HS256"}),
	)
	if err != nil || !token.Valid {
		return 0, errors.New("登录令牌无效或已过期")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !claims.VerifyExpiresAt(time.Now().Unix(), true) {
		return 0, errors.New("登录令牌无效或已过期")
	}

	// 登录接口将 userId 写成字符串，这里取出并转换。
	userIDText, ok := claims["userId"].(string)
	if !ok {
		return 0, errors.New("登录身份无效")
	}

	userID, err := strconv.ParseInt(userIDText, 10, 64)
	if err != nil || userID <= 0 {
		return 0, errors.New("登录身份无效")
	}

	return userID, nil
}
