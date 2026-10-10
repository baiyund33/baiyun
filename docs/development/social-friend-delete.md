# 单向删除好友与重新申请

更新：2026-10-08。后端API/RPC/Model和前端已接入，Go回归测试、构建与模拟浏览器测试通过；真实数据库删除/重加尚未执行。

## 业务规则与参考

删除仅移除本人持有的好友关系。例如A删除B，仅删除friend表中A→B，保留B→A。A可以重新申请，B仍持有A所以不能重复申请A。再次接受时CreatePair补回缺失方向，不重复插入已有方向。

参考 `go-zero-im/easy-im-master/go-im/apps/social/rpc/models/social_model.go` 的有向用户对、`internal/logic/friendlistlogic.go` 按user_id查询，以及前端 `web-im/src/components/index.vue` 的联系人详情区。未找到参考删除专用逻辑，不将本实现描述为照搬；参考使用GORM，本项目保持goctl协议生成与sqlx自定义Model。

## 文件与调用链

- `apps/social/api/social.api`：JWT保护的DELETE定义，请求仅包含路径friendUserId。
- `apps/social/api/internal/handler/deletefriendhandler.go`：解析路径，使用请求context调用logic。
- `apps/social/api/internal/logic/deletefriendlogic.go`：ctxdata.GetUserID取JWT操作者→SocialRpc.DeleteFriend。
- `apps/social/rpc/internal/logic/deletefriendlogic.go`：正数/不能删除自己校验→FriendModel.DeleteByUserID(ctx,userId,friendUserId)。
- `apps/social/rpc/models/friendmodel.go`：按user_id AND friend_user_id单条删除，RowsAffected==1表示成功；数据库异常Internal，没有关系NotFound。
- `apps/social/rpc/internal/logic/applyfriendlogic.go` / `models/friendrequestmodel.go`：先查本方当前关系，已是好友AlreadyExists；本方没有关系时旧status1/2条件重开为0，status0拒绝重复申请。
- `web/src/api/social.ts` / `types/social.ts`：deleteFriendApi，DELETE无Body、自动Bearer。
- `web/src/components/FriendDetails.tsx`：单向删除说明、确认/取消/Escape、重复提交锁、失败保留好友和显示原因；确认时焦点进入确认按钮。即使已切换详情，成功仍通知工作区刷新。
- `web/src/components/DesktopWorkspace.tsx`：成功清除对应详情、重新加载好友第一页和提示；新选中的其他好友不会被旧删除结果清除。
- `apps/social/api/social.go`：WithUnauthorizedCallback返回401 JSON，与用户API一致。

流程：好友选择→FriendDetails确认→deleteFriendApi→JWT→API→RPC→条件SQL→响应→工作区刷新。重新添加仍用现有添加好友表单，无新增协议或数据库迁移。

## 请求与验证

```http
DELETE /api/social/friends/17
Authorization: Bearer <登录令牌>
```

成功JSON `{"friendUserId":17}`；缺令牌401 `{"message":"请先登录或令牌已失效"}`。目标是好友用户ID，不是friend关系主键。受信任RPC接收操作者ID，公开API只从JWT取身份。

实际执行（根目录，Go可执行文件位于C:\Program Files\Go\bin）：

```powershell
go test ./apps/social/rpc/internal/logic
go build ./apps/user/api/... ./apps/user/rpc/... ./apps/social/api/... ./apps/social/rpc/...
```

已通过。`friendflow_test.go` 使用模拟依赖验证删除方向、重复删除NotFound、非法参数不进入Model、数据库错误Internal；验证已有好友反向申请被拒绝、只保留对方关系时可重开已接受/已拒绝申请、待处理不重开、条件更新失败Aborted。这是RPC流程测试，不代替真实SQL事务/数据库测试。

web目录执行tsc和Vite build通过。Playwright+Edge模拟HTTP验证确认/取消/Escape、friendUserId目标/JWT/无Body、处理中禁用取消、失败保留好友/重试、成功清详情刷新列表、390px无横向溢出。截图 `web/friend-delete-mobile-check.png` 已检查。

## 本机运行状态

2026-10-08代理启动user RPC8080、social RPC8081、user API8888、social API8889，复用已运行的Vite3000。所有端口监听已核对，启动stderr为空。各后端进程继承NO_PROXY=*，未修改用户持久环境或仓库YAML。API密钥配置比较一致，没有输出密钥。

实际HTTP检查：localhost:3000返回200；通过Vite调用/api/user/ping返回200及hello；social好友查询和删除无令牌均返回401中文JSON，无数据库删除。浏览器地址使用 http://localhost:3000（现有Vite监听::1，不承诺127.0.0.1可访问）。

后端由隐藏进程运行，启动命令为 `go run ./apps/<user或social>/<api或rpc> -f apps/<服务>/<类型>/etc/<服务>.yaml`，执行目录项目根。本轮日志和启动进程清单在 `C:\Users\29417\AppData\Local\Temp\baiyun-runtime-20261008-194717`；停止时核对此进程清单及8080/8081/8888/8889的PID，仅停止本轮相关进程，不使用按名称批量结束Go。当前监听PID：20604/17452/37540/14304，仅代表本次启动，重启后会变化。

依赖与部署沿用 [MySQL](../deploy/mysql.md)、[etcd](../deploy/etcd.md)、[Web](../deploy/web.md)。没有新增组件或改变连接配置。

## 待验证与限制

由用户用两个真实账号执行A删除B→确认B仍有A→A申请B→B接受→A关系恢复，并检查已是好友/待处理重复申请、无令牌和不存在关系。代理未创建测试账号或删除已有云数据库记录。

复用申请行会覆盖旧状态/附言而保留created_at，不提供完整历史审计；关系查询和重开不是跨流程整体事务，不能声称覆盖全部并发竞态。好友/通知仍使用页码分页，增删/updated_at排序变化可能导致遗漏；去重不等于游标一致性。聊天、群聊、拉黑待后续开发。
