# 用户服务 Docker 部署

更新：2026-10-02。用户确认 RPC/API 服务器部署完成，Postman Ping 测试通过；验证来源为用户反馈，代理未访问服务器。CRUD 和异常流程仍待验证。

## 作用与使用方

API 和 RPC 分别构建为独立镜像和容器。HTTP → API → RPC → MySQL。RPC 初始化 Redis，向云端 etcd 注册；API 通过 etcd 发现地址。

## 环境与版本

目标为用户的 Ubuntu 服务器，具体版本、CPU 架构和 Docker/Compose 版本待确认。服务器安装 Docker 和 Compose 即可，不需另装 Go。

本轮核对实际文件：API 和 RPC 均使用单阶段 golang:1.26.8（Debian 基础），在同一镜像内编译和运行，满足 go.mod 的 Go 1.26.7 要求，可用于 Ubuntu 宿主机。CGO_ENABLED=0、GOOS=linux 构建程序，未硬编码 CPU 架构；实际拉取和运行待验证。需要 Docker Engine 和 Compose V2。

## 文件与配置

- Dockerfile：apps/user/rpc/Dockerfile、apps/user/api/Dockerfile；编排文件：根 docker-compose.yml。
- 构建上下文：项目根目录，读取 go.mod、go.sum 和所有 Go 源码。
- 根 .dockerignore 排除 etc、文档和本机产物，现有 YAML 凭据不进入镜像。
- 程序：/app/user-rpc、/app/user-api；配置：/app/etc/user.yaml，通过只读挂载提供。
- 时区：TZ=Asia/Shanghai。两个应用使用 Go 基础镜像内的系统数据，时区和证书实际运行待验证。
- 两个镜像保留 Go 工具链及源码，体积较大，换取 Dockerfile 简单；COPY 的内容仍受根 .dockerignore 控制。
- 简化版本未创建普通用户，运行层默认 root；挂载文件需可读。
- 端口：RPC 8080、API 8888。EXPOSE 仅声明，不自动发布。
- ENTRYPOINT 直接启动 Go 程序，并用 -f 指定配置。启动时 conf.MustLoad 检查配置，缺失或无法解析时启动失败。

## 部署步骤：Ubuntu 上使用 Compose

将项目上传到服务器，在包含 go.mod 和 docker-compose.yml 的项目根目录执行以下 Bash 命令。先准备两个 etc/user.yaml，核对云端连接地址和凭据、API Host=0.0.0.0/Port=8888、RPC ListenOn=0.0.0.0:8080。配置由用户提供，不写进 Compose。

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 user-rpc user-api
```

build.context 为项目根目录，分别使用两个 Dockerfile 自动构建；端口仅发布 API 的 8888。Compose 自动创建默认共享网络。参照用户提供的服务器文件，采用 container_name、restart: always、列表格式 environment 和短格式 volumes。容器名为 baiyun-user-rpc、baiyun-user-api，不能与已有容器重名；重启策略不会修复错误配置。

服务依赖顺序：既有 MySQL、Redis、etcd 可用 → RPC → API → HTTP 验证。depends_on 仅控制启动顺序，不代表 RPC 已就绪；本文件没有健康检查。配置使用 source:target:ro 短格式只读挂载，部署前必须确认两个源文件存在；短格式在源路径缺失时可能创建目录，导致配置读取失败。此 Compose 不部署或初始化中间件；用户表需已在 MySQL 中创建。

## 应用接入和网络

RPC 的 ListenOn 使用 0.0.0.0:8080，API Host=0.0.0.0、Port=8888。两端的 etcd 地址和 Key 必须匹配，数据库和 Redis 填服务器实际可达地址及凭据。现有入口未启用 conf.UseEnv，不能仅填写环境变量占位符就期待自动展开。

两个应用容器共享 Compose 默认网络，RPC 无需发布宿主机端口。当前 go-zero 在 ListenOn=0.0.0.0:8080 时，会使用 POD_IP 或内部 IP 发布 etcd 地址；Compose 未设置 POD_IP，预期发布容器地址，需实际核对 API 能访问。跨服务器不能假定容器私网互通。容器的 localhost 是自身；云端连接配置不能误写成本机地址。启动部署前检查同一 etcd Key 下没有不可达的 Windows 本机旧实例。

## 验证

最新结果：用户提供 Ubuntu 构建输出，随后确认部署完成及 Postman Ping 无误，正常 API → RPC 调用链通过。以下“未执行”指代理本机操作，不否定用户服务器反馈；最终镜像标签、原始 HTTP 响应和 CRUD 验证详情待核实。
已静态核对两个单阶段 Dockerfile 的编译路径和入口、Compose 两个 build 路径、配置文件存在性、挂载路径和 API 端口。没有执行 go build、docker build、Compose 或服务器部署；本轮 Get-Command docker 未找到 Docker CLI。Python 缺少 PyYAML，未用 YAML 解析器校验；服务器上的 docker compose config --quiet 为待执行的正式校验。

部署后应确认两个容器持续运行、RPC 无 Redis/etcd 连接错误。HTTP POST /api/user/ping，JSON name=baiyun，期望 HTTP 200、message=hello, baiyun。然后使用专用测试用户验证 POST /api/user、PUT /api/user/:id、DELETE /api/user/:id，并核对 MySQL 记录。只看容器 Running 不代表业务健康。

## 日常操作与排错

在服务器项目根目录执行：

```bash
docker compose logs -f user-api user-rpc
docker compose restart user-api user-rpc
docker compose stop
```

修改源码后使用 docker compose up -d --build 重建；restart 不重新构建镜像。配置无法读取查挂载和权限；8888 占用查宿主机端口；Redis/etcd 超时查地址和网络；gRPC Unavailable 查 etcd 中的 RPC 地址和代理。PUT/DELETE 的 ID 位于路径；手机号重复 1062 是业务唯一键问题。

## 数据与变更影响

应用镜像不存储 MySQL、Redis 或 etcd 数据，它们的卷和备份需按已有服务器部署核实。日志建议 Log.Mode=console；如改用文件日志需挂载可写目录。镜像更新不应删除或重建表，回退使用已验证的旧镜像及匹配配置。

参考项目：deploy/dockerfile/Dockerfile_user_rpc_dev、Dockerfile_user_api_dev 及根 docker-compose.yaml，借鉴时区、独立服务、-f 启动和共享网络。本项目只编排已有的 API/RPC，通过 build 自动编译、只读挂载配置；不复制参考项目的中间件清单、凭据或服务器地址。

官方依据：[Go 镜像标签](https://github.com/docker-library/official-images/blob/master/library/golang)、[Compose 服务配置](https://docs.docker.com/reference/compose-file/services/)。
