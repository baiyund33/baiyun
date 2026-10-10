package ctxdata

import (
	"context"
	"strconv"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func GetUserID(ctx context.Context) (int64, error) {
	userID, ok := ctx.Value("userId").(string)
	if !ok || userID == "" {
		return 0, status.Error(codes.Unauthenticated, "请先登录")
	}

	id, err := strconv.ParseInt(userID, 10, 64)
	if err != nil || id <= 0 {
		return 0, status.Error(codes.Unauthenticated, "登录身份无效")
	}

	return id, nil
}
