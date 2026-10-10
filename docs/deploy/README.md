# 部署文档

更新：2026-10-02。实际核对 API/RPC 均为 golang:1.26.8 单阶段编译和运行。根 docker-compose.yml 已创建，统一构建和启动两个应用、只读挂载配置、发布 API 8888；镜像和服务器运行待验证。

Compose 已参照用户提供的服务器文件改为固定容器名、restart: always、列表时区配置及短格式只读挂载；运行前确认两个 YAML 文件存在。

| 组件 | 使用方和作用 | 状态 | 文档 |
| --- | --- | --- | --- |
| user RPC | 用户业务、MySQL 访问，8080 | 用户确认部署和 Ping 成功；CRUD 待验证 | [用户服务 Docker](user-docker.md) |
| user API | HTTP 接口、调用 RPC，8888 | 用户确认部署和 Postman Ping 成功 | [用户服务 Docker](user-docker.md) |
| MySQL | RPC 用户表持久化 | 已有连接代码，服务器部署信息待核实 | [MySQL](mysql.md) |
| Redis | RPC ServiceContext 初始化 | 业务缓存未使用，服务器部署信息待核实 | [Redis](redis.md) |
| etcd | RPC 注册、API 发现 | 已提供服务器单节点 Compose 补充片段，部署和可达性待验证 | [etcd](etcd.md) |
| IM WS | JWT握手与消息回显，8890 | 代码/配置已存在；本地启动与连接待验证，服务器部署未配置 | [WebSocket运行](im-websocket.md) |

启动顺序：已有 MySQL、Redis、etcd 可用 → user RPC → user API → HTTP 验证。Ubuntu 服务器上的两个应用使用同一个 Compose 网络，确保从 etcd 发现的 RPC 地址可达。

- [Web 前端与双 API 转发](web.md)：生产构建和模拟浏览器检查通过；服务器发布与真实联调待验证。
