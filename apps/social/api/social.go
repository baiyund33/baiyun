// Code scaffolded by goctl. Safe to edit.
// goctl 1.10.2

package main

import (
	"flag"
	"fmt"
	"net/http"

	"baiyun/apps/social/api/internal/config"
	"baiyun/apps/social/api/internal/handler"
	"baiyun/apps/social/api/internal/svc"

	"github.com/zeromicro/go-zero/core/conf"
	"github.com/zeromicro/go-zero/rest"
	"github.com/zeromicro/go-zero/rest/httpx"
)

var configFile = flag.String("f", "etc/social.yaml", "the config file")

func main() {
	flag.Parse()

	var c config.Config
	conf.MustLoad(*configFile, &c)

	server := rest.MustNewServer(c.RestConf, rest.WithUnauthorizedCallback(
		func(w http.ResponseWriter, r *http.Request, err error) {
			httpx.WriteJson(w, http.StatusUnauthorized, map[string]string{
				"message": "请先登录或令牌已失效",
			})
		},
	))
	defer server.Stop()

	ctx := svc.NewServiceContext(c)
	handler.RegisterHandlers(server, ctx)

	fmt.Printf("Starting server at %s:%d...\n", c.Host, c.Port)
	server.Start()
}
