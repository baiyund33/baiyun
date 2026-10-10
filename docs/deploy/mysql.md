# MySQL 接入与部署记录

状态：连接及用户 model 已存在，服务器安装方式、版本和持久化信息待确认；未由代理部署或查询数据库。

1. **作用与使用方**：user RPC 的 UserModel 保存用户。API 经 RPC 访问 MySQL。`apps/user/rpc/models/user.sql` 定义用户表，phone 唯一。
2. **环境与版本**：Go 1.26.7、go-zero 1.10.3；MySQL 版本、操作系统、安装方式未知。
3. **文件与配置**：RPC etc/user.yaml 的 Mysql.DataSource；账号、密码、数据库和端口由用户提供，本文不复制真实值。容器以只读配置挂载读取凭据。
4. **部署步骤**：沿用远程实例；先确认版本、端口和应用账号权限，再用 DataGrip 连接 DataSource 指定数据库。user 表不存在时执行 user.sql；已有同名表先核对结构。实际服务器服务名和安装命令待补充。
5. **应用接入**：ServiceContext 使用 sqlx.NewMysql，再交给 models.NewUserModel。外部数据库填写可达地址，容器内 localhost 是自身。
6. **验证**：DataGrip 执行 SELECT VERSION() 和 SHOW CREATE TABLE `user`，再用专用测试用户验证 CRUD 和数据库记录。历史截图的 1062 证明当时链路到达 MySQL，不能认定全部 CRUD 成功或当前连接可用。
7. **日常操作与排错**：数据库日志、停止和重启按真实安装方式待补。连接超时查网络；认证失败查权限；1062 为唯一键重复。应用日志命令见 [Docker 部署](user-docker.md)。
8. **数据与变更影响**：数据目录/卷、备份及恢复待核实。应用部署不删表；改表前先准备备份和迁移方案。

### 2026-10-05 好友 RPC 接入

apps/social/rpc/etc/social.yaml 已配置 social.rpc 注册键、监听8081，UserRpc.Etcd 使用既有用户服务发现键 user.rpc；ServiceContext 已初始化用户 RPC 客户端和 sqlx FriendRequestModel。启动前需 user RPC 可用、friend_request 表已创建，应用数据库必须对应 SQL 实际执行的数据库。未新增中间件容器；social Dockerfile/Compose 部署尚未核对，当前只是本机 RPC 接入。代理未构建、启动或验证连接。

## 2026-10-06 好友关系表规划

接受申请需要同数据库InnoDB friend表（双向两行、唯一用户对）及事务；当前仅指导用户编写apps/social/rpc/models/friend.sql，文件/实际建表尚未确认。使用social现有Mysql.DataSource对应的数据库，保留friend_request，不改用户表，不删除数据。新表与处理功能未验证。

2026-10-06：用户反馈friend表SQL已执行，本机SQL和FriendModel已存在。代理未连接数据库核实实际结构/唯一索引；接受事务及数据库验证待后续完成。
