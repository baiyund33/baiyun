第一步仍是增加密码哈希字段。在 [user.sql](E:/code/baiyun/apps/user/rpc/models/user.sql) 的 `phone` 下方加入：

```
`password_hash` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '密码哈希',
```

然后在实际数据库执行一次：

```
ALTER TABLE `user`
ADD COLUMN `password_hash` VARCHAR(255) NOT NULL DEFAULT ''
COMMENT '密码哈希' AFTER `phone`;
```

下一步：**重新生成数据库模型，让 `User` 增加 `PasswordHash` 字段。**

```
cd E:\code\baiyun
goctl model mysql ddl -src apps/user/rpc/models/user.sql -dir apps/user/rpc/models
```
#### 2.**重复手机号需要返回明确错误**
捕获插入时的 MySQL `1062`，转换为 `codes.AlreadyExists`、提示“手机号已注册”。数据库唯一索引继续保留，不能只靠提前查询。
```go
if err != nil {
    var mysqlErr *mysql.MySQLError
    if errors.As(err, &mysqlErr) && mysqlErr.Number == 1062 {
        return nil, status.Error(codes.AlreadyExists, "手机号已注册")
    }
    return nil, status.Error(codes.Internal, "注册失败")
}
```