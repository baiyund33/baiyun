# Web 前端部署与 API 转发

2026-10-05：前端构建已验证，服务器静态站点和反向代理配置待部署。本轮没有新增中间件镜像、修改Docker Compose或执行服务器操作。

## 作用与配置

web/vite.config.ts 开发代理：/api/user → http://127.0.0.1:8888；/api/social → http://127.0.0.1:8889。对应 apps/user/api 和 apps/social/api，用户登录签发的JWT用于好友API。密钥只由后端保存，不放入前端配置或构建产物。

前置：MySQL、etcd可用，用户RPC8080、好友RPC8081、用户API8888、好友API8889启动且调用正常。组件说明：[MySQL](mysql.md)、[etcd](etcd.md)。这些端口依据当前本机配置，服务器Compose的social部署尚未准备。

## 本地构建和联调

PowerShell，从 E:\code\baiyun\web 执行 npm install、npm run dev，浏览器访问 http://localhost:3000。本轮复用已有依赖，不执行安装；TypeScript/Vite构建和模拟浏览器测试通过，实际用户API→好友API→RPC联调待验证。

生产运行 npm run build，将 dist 中的静态资源部署到Nginx站点。Vite开发代理不随dist部署。

## 服务器反向代理

现有服务器Nginx使用host网络时，可以在实际站点 server 块中使用如下配置，前提是两个API已经映射到宿主机的对应端口：

```nginx
location /api/user/ {
    proxy_pass http://127.0.0.1:8888;
    proxy_set_header Host $host;
    proxy_set_header Authorization $http_authorization;
}
location /api/social/ {
    proxy_pass http://127.0.0.1:8889;
    proxy_set_header Host $host;
    proxy_set_header Authorization $http_authorization;
}
```

proxy_pass不追加URI，保留后端实际路径。若Nginx改为独立容器网络，127.0.0.1指向Nginx自身，必须按实际部署网络改用API服务地址；不直接套用本例。站点静态root和HTTPS证书沿用实际部署，本轮未修改服务器nginx.conf。

## 验证与排错

上线前在服务器按实际Nginx运行方式验证配置；从网页登录，向已有用户发送申请，再核对数据库记录。记录真实HTTP状态和请求路径，避免输出JWT或密码。好友申请502通常检查8889映射和API进程；401检查登录有效期和两API密钥；RPC连接失败检查etcd发现地址可达。

前端不保存业务数据，账户/申请在数据库持久化；发布前保留上次dist用于回退。服务器发布、HTTPS及真实联调尚未执行。
# 2026-10-08 本机启动验证

本轮复用已运行Vite（localhost:3000，监听::1），从根目录启动user RPC8080、social RPC8081、user API8888、social API8889，端口均监听。各新后端进程使用NO_PROXY=*避开gRPC代理；没有修改仓库连接YAML或用户持久环境。实际页面200，通过Vite的/api/user/ping返回200，social查询/删除无JWT返回401中文JSON。这里只确认本机启动和只读/无令牌响应，不代表生产Web部署或真实好友删除验证完成。临时启动日志与进程记录见 [单向删除好友开发记录](../development/social-friend-delete.md)。
