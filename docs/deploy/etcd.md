# etcd 服务发现部署记录

## 2026-10-02：服务器 Compose 补充方案

已提供 components/etcd/docker-compose.yml；仅把 etcd 服务块加入服务器 /data/by/docker-compose.yml 的 services 下，不增加第二个 services。SERVER_IP 必须替换为应用可访问的服务器 IP。使用官方 quay.io/coreos/etcd:v3.5.21 固定版本，未称为最新版；Ubuntu Docker Compose V2，单节点，无高可用。参考本地 go-zero-im 根 docker-compose.yaml 的独立组件组织，采用官方参数，未复制其地址或凭据。

端口 2379 发布到宿主机，2380 只用于单节点内部通信。/data/etcd/data 持久化到 /etcd-data。此配置无认证和 TLS，2379 应在安全组或防火墙限制为实际应用来源。用户此前说明已有 etcd，先确认旧容器、端口和数据目录，不能将新实例参数当作旧实例恢复配置。

在 Ubuntu Bash 中执行：

```bash
cd /data/by
mkdir -p /data/etcd/data
docker compose config --quiet
docker compose up -d etcd
docker compose logs --tail=50 etcd
docker compose exec etcd /usr/local/bin/etcdctl --endpoints=http://127.0.0.1:2379 endpoint health
docker compose exec etcd /usr/local/bin/etcdctl --endpoints=http://127.0.0.1:2379 endpoint status --write-out=table
```

健康检查预期报告 healthy，再启动 baiyun RPC 和 API 验证 Ping。两个 Compose 的默认网络不同；RPC Etcd.Hosts、API UserRpc.Etcd.Hosts 使用服务器 IP:2379，Key 均为 user.rpc。API/RPC 使用 baiyun Compose 默认共享网络，etcd 发布的 RPC 地址仍需验证可达。

日常操作在 /data/by 执行 docker compose logs -f etcd、docker compose restart etcd、docker compose stop etcd。连接失败检查地址、防火墙；启动失败检查端口、同名容器、数据权限。停止 etcd 会影响服务发现。数据位于 /data/etcd/data，不清空；升级前记录旧版本并用 etcdctl snapshot save 备份且复制到安全位置，恢复方案需按实际版本单独验证。

本机无 Docker，服务器未访问，镜像拉取、配置解析和运行均未验证。以下为较早部署信息，未知信息仍待核实。[官方容器指南](https://etcd.io/docs/v3.5/op-guide/container/)。

状态：用户说明已部署于云服务器；RPC 注册和 API 发现配置存在，容器部署后的地址待验证。

1. **作用与使用方**：RPC 发布地址，API UserRpc 客户端发现地址。etcd 不转发业务请求。
2. **环境与版本**：应用 go-zero 1.10.3；云端 etcd 版本、操作系统、运行方式和管理工具待核实。
3. **文件与配置**：RPC etc/user.yaml 的 Etcd.Hosts/Key；API etc/user.yaml 的 UserRpc.Etcd.Hosts/Key。两者地址一致、Key=user.rpc。认证、TLS 按服务器真实情况配置，是否启用待核实。
4. **部署步骤**：沿用既有 etcd，确认可达后先启动 RPC，再启动 API。停止或隔离本机旧 RPC，避免共用 Key 注册不可达的本机地址。服务器实际启动命令待补，不虚构服务名。
5. **应用接入**：ListenOn 是 RPC 监听地址；etcd 中的实际发布地址还需核对。应用容器使用 baiyun Compose 默认共享网络；跨服务器容器私网不可直接假定可达。当前 Endpoints 已注释。
6. **验证**：用既有管理工具核对健康状态、user.rpc 前缀下的成员地址和 API 可达性，最终验证 HTTP Ping。管理工具及实际结果待确认。
7. **日常操作与排错**：云端日志、停止和重启命令按实际部署待补。DeadlineExceeded 查网络和认证；API Unavailable 查 RPC 地址；代理排除列表需覆盖 etcd 和实际 RPC 地址。
8. **数据与变更影响**：数据目录、快照和恢复方式待核实。不能随意清空 key 或数据目录；升级需先验证备份与恢复。

### 2026-10-05 好友 RPC 接入

apps/social/rpc/etc/social.yaml 已配置 social.rpc 注册键、监听8081，UserRpc.Etcd 使用既有用户服务发现键 user.rpc；ServiceContext 已初始化用户 RPC 客户端和 sqlx FriendRequestModel。启动前需 user RPC 可用、friend_request 表已创建，应用数据库必须对应 SQL 实际执行的数据库。未新增中间件容器；social Dockerfile/Compose 部署尚未核对，当前只是本机 RPC 接入。代理未构建、启动或验证连接。

### P5-05 API 骨架复核与配置指导

social.api、API handler/routes/types/入口已存在。Config 当前定义 Frie zrpc.RpcClientConf，建议统一为 SocialRpc；Auth.AccessSecret 已存在，AccessExpire 仅验证JWT不需要，可暂保留。ServiceContext 未初始化客户端。API YAML 当前 Port8888，与用户API冲突，指导改8889、添加 SocialRpc.Etcd Key social.rpc 和 Auth.AccessSecret（与登录签发使用的用户API密钥相同，不打印）。仅指导未修改配置、未构建。下一步完成配置后初始化 socialclient.Social，再从context解析userId调用ApplyFriend。

### 联调 RPC 代理故障

用户反馈 Unavailable，server preface读连接127.0.0.1:7897被关闭。只读检查当前环境 HTTPS_PROXY=http://127.0.0.1:7897、NO_PROXY未设置；8080/8081/8888/8889均监听。错误连接已显示经过代理，指导在启动Go服务的PowerShell设置 NO_PROXY=* 并重启；GoLand需各运行配置环境变量设置，不能假定终端环境会修改已运行进程。代理未修改环境或重启。若仍失败继续核对etcd登记的服务地址，监听存在不等于健康。

## 2026-10-08 登录RPC EOF排错

用户前端登录返回Unavailable/server preface EOF。只读确认用户API8888与RPC8080均有Go进程监听，Vite用户代理指向8888；UserRpc配置云etcd key user.rpc。工具环境HTTPS_PROXY指向7897，NO_PROXY缺失，启动Go进程实际环境未确认，优先指导在实际启动终端NO_PROXY=*后重启。若仍失败临时用户API使用Endpoints127.0.0.1:8080替代Etcd以隔离云端登记旧地址，之后恢复发现并核对实际登记地址。未修改配置、环境、重启或发登录请求，尚未确认修复。
追加证据：只读检查用户API进程52980的TCP连接，确认存在到127.0.0.1:7897的Established连接。优先在实际启动环境设置NO_PROXY=*并重启用户API，不能只改无关终端。
