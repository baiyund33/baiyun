#### 1.创建 **好友申请表的 SQL 文件**。

参考项目使用 `social` 管理好友和群组，我们沿用这个目录。你创建：

`E:\code\baiyun\apps\social\rpc\models\friend_request.sql`

写入：

```sql
CREATE TABLE IF NOT EXISTS `friend_request` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '申请ID',
    `from_user_id` BIGINT NOT NULL COMMENT '申请人ID',
    `to_user_id` BIGINT NOT NULL COMMENT '接收人ID',
    `message` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '申请附言',
    `status` TINYINT NOT NULL DEFAULT 0 COMMENT '0待处理 1已接受 2已拒绝',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_from_to` (`from_user_id`, `to_user_id`),
    KEY `idx_to_status` (`to_user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

两个索引的作用：

|索引|作用|
|---|---|
|`uk_from_to`|同一个人向同一个目标只保留一条申请记录，防止并发重复插入|
|`idx_to_status`|加快查询“我收到的待处理申请”|

当前采用简单规则：**被拒绝后重新申请，更新原记录为待处理，不新增记录**。已接受后的好友关系后续单独建表。

先保存文件，下一步检查 SQL，再到服务器数据库执行建表。

建表完成后，在本机 `E:\code\baiyun` 执行生成 Model 的命令：

```goctl
goctl model mysql ddl -src apps/social/rpc/models/friend_request.sql -dir apps/social/rpc/models
```

#### 2.编写proto文件
```proto
// 使用 proto3 语法。  
syntax = "proto3";  
  
// 定义协议命名空间，避免不同服务的名称冲突。  
// baiyun：项目名称；user：用户模块。  
package baiyun.social;  
  
// 指定生成文件位于本 RPC 服务目录下的 user 子目录，Go 包名为 user。  
option go_package = "./social";  
  
// 发送好友申请。  
message ApplyFriendRequest  {  
  int64 from_user_id = 1; // 申请人，后续由 API 从登录 Token 获取。  
  int64 to_user_id = 2;   // 接收人。  
  string message = 3;     // 申请附言。  
}  
  
message ApplyFriendResponse  {  
  int64 id = 1; // 申请记录 ID。  
}

service social {  
  // 发送好友申请。  
  rpc ApplyFriend(ApplyFriendRequest) returns (ApplyFriendResponse);  
}
```
执行命令
```
goctl rpc protoc apps/social/rpc/social.proto --go_out=apps/social/rpc --go-grpc_out=apps/social/rpc --zrpc_out=apps/social/rpc --name-from-filename
```

#### 3.config yaml servicecontext
