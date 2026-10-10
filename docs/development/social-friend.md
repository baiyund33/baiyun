# 好友申请开发

2026-10-05：部分实现，待构建和运行验证。

参考 go-zero-im/easy-im-master/go-im 下 apps/social/rpc/social.proto、models/social_model.go、internal/logic/friendputinlogic.go、internal/config/config.go 和 internal/svc/servicecontext.go。沿用 social 模块和申请/关系分表，本项目采用 goctl model + sqlx，暂不引入参考 GORM、CacheService。

实际文件：apps/social/rpc/models/friend_request.sql 及生成的 FriendRequestModel 已存在；social.proto 定义 ApplyFriend，请求 from_user_id/to_user_id/message，响应 id；goctl RPC 骨架已存在。申请 SQL 每个有向用户对一条记录，拒绝后重新申请计划复用记录，不保存完整历史。数据库建表尚未确认。

Config.Mysql.DataSource 和 etc/social.yaml 对应配置已存在。internal/svc/servicecontext.go 的 MysqlConn 初始化误写 MsqlConn，待用户修正；FriendRequestModel 尚未初始化。当前 social ListenOn 8080，同机启动会与 user RPC 默认端口冲突，计划使用 8081。Mysql 配置提供方式沿用 [MySQL 部署说明](../deploy/mysql.md)，不得复制参考凭据。

ApplyFriendLogic 仍为空实现。HTTP API、申请权限/目标用户检查、重复申请及接受拒绝流程尚未实现；from_user_id 后续应由 API 从 JWT 获取。当前无业务调用链验证结果。下一步修正 svc、接入 model 和独立端口，由用户在根目录执行 go build ./apps/social/rpc/...，然后实现业务；代理未执行生成、构建或连接验证。

### P5-02 修正复核

已只读确认 MysqlConn 拼写修正、social ListenOn 改为 0.0.0.0:8081、etcd Key 为 social.rpc。FriendRequestModel 尚未初始化，ApplyFriendLogic 仍为空实现。未执行构建或连接验证。下一步用户在 ServiceContext 引入 models.FriendRequestModel，复用同一 sqlx 连接初始化。

### P5-02 Model 初始化复核

已确认 ServiceContext.FriendRequestModel 使用 models.NewFriendRequestModel(conn)，与 MysqlConn 复用连接；SQL 表名仍为 friend_request，生成类型仍为 FriendRequestModel，未改名为 FriendApplicationModel，当前命名一致。仅静态检查，未构建或连接数据库。下一步用户执行 go build ./apps/social/rpc/...，再实现 ApplyFriend 逻辑。

### P5-03 目标用户查询前置

当前 user.proto 没有按 ID 查询用户的 RPC。为实现好友申请目标存在性检查，下一步用户添加 GetUserRequest(id)、GetUserResponse(id,name) 和 User.GetUser，再生成并实现 UserModel.FindOne 的最小查询。参考 user/rpc/internal/logic/finduserlogic.go 的用户查询，本项目限定单 ID、不返回手机号或密码。只指导，不修改业务或生成；social 构建结果未收到，不记录通过。

### P5-03 GetUser 实现复核

已确认 user.proto、pb、userclient 和 UserServer 均包含 GetUser；GetUserLogic 校验 ID>0、调用 UserModel.FindOne、ErrNotFound 转 NotFound，成功仅返回 Id/Name。其他数据库错误直接返回，建议改为 Internal“查询用户失败”，避免原始数据库错误外露。social Config/ServiceContext 尚无 UserRpc，ApplyFriend 仍为空实现。仅静态检查，未构建或运行验证。下一步修正错误映射，再接入好友服务 UserRpc 客户端。

### P5-04 ApplyFriend 实现指导

当前 ApplyFriend 仅有目标 ID 判断且误用 Internal；应改 InvalidArgument。UserRpc 尚未接入。指导流程：初始化用户客户端，校验两个 ID/不能添加自己/附言最多255字符，GetUser 检查双方存在，查询有向申请；待处理拒绝重复、已接受拒绝、已拒绝通过条件 UPDATE(status=2) 重新申请；新申请 Insert 捕获1062。重新申请需自定义 Reopen 方法检查影响行数，避免全字段 Update 覆盖并发状态。代码仍待用户编写，未生成构建。好友关系表尚未实现，当前不能检查反向好友关系；请求身份后续来自 API JWT，RPC 不直接面向公网。

### P5-04 申请逻辑静态复核

ApplyFriend 已实现 ID/自申请/255字符校验、用户 RPC 查询、状态分支、条件 Reopen、新申请 Insert 和1062处理；Config.UserRpc、YAML user.rpc、ServiceContext 用户客户端和 FriendRequestModel 已一致。Reopen 条件 status=2、参数顺序及影响行数判断正确。数据库实际索引/建表及运行行为未验证。

发现 user GetUserLogic 将 ID<=0 错误改成 Internal“查询用户失败”，而数据库其他错误仍原样返回；应 ID 错误 InvalidArgument，数据库其他错误 Internal。ApplyFriend 获取新 ID 提示“获取好友申请I记录D失败”有错字。好友关系、反向申请关系校验和 HTTP/JWT 身份接入仍未实现，不能称完整好友功能完成。代理未执行生成、构建或启动；下一步用户修正后 go build ./apps/social/rpc/... ./apps/user/rpc/...，重启用户和好友 RPC，再测正常/重复/自身/不存在/重新申请。

### P5-04 最终静态复查

再次核对确认 GetUser 无效 ID 已返回 InvalidArgument、其他数据库错误返回 Internal，ApplyFriend 获取记录ID提示已修正。当前“发送/重新提交好友申请”的 RPC 代码已实现，静态未发现新的阻断问题；不等于构建、数据库实际索引或运行测试通过。发现 rpc.exe 文件存在，但无法据此确认对应当前源码构建成功。尚无 social API/JWT 身份入口、好友关系校验、接受/拒绝接口和申请列表。下一步用户构建并验证 RPC，再接入 JWT 保护的 HTTP 申请接口，不能将整个好友模块记为完成。

### P5-05 好友申请 API 指导开始

核对当前 apps/social 仅有 RPC，无 API；已读参考 social/api/social.api 和 internal/logic/friend/friendputinlogic.go。用户下一步创建 apps/social/api/social.api，定义 ApplyFriendRequest(toUserId,message optional)、ApplyFriendResponse(id)，POST /api/social/friend/apply，@server(jwt: Auth)。HTTP 不接收申请人ID，后续从 JWT userId 解析填入 RPC FromUserId。通过 goctl api go -api apps/social/api/social.api -dir apps/social/api 生成。仅检查命令帮助、给出指导，未创建业务文件或执行生成。生成后需添加 SocialRpc、匹配用户服务的 JWT secret、独立 API 端口并实现 logic 才能测试。

### P5-05 API 骨架复核与配置指导

social.api、API handler/routes/types/入口已存在。Config 当前定义 Frie zrpc.RpcClientConf，建议统一为 SocialRpc；Auth.AccessSecret 已存在，AccessExpire 仅验证JWT不需要，可暂保留。ServiceContext 未初始化客户端。API YAML 当前 Port8888，与用户API冲突，指导改8889、添加 SocialRpc.Etcd Key social.rpc 和 Auth.AccessSecret（与登录签发使用的用户API密钥相同，不打印）。仅指导未修改配置、未构建。下一步完成配置后初始化 socialclient.Social，再从context解析userId调用ApplyFriend。

### P5-05 API 配置与客户端复核

已核对 social API SocialRpc 配置、8889端口、social.rpc Key，JWT密钥与用户API字面值一致（未输出）。ServiceContext 已使用 socialclient.NewSocial 初始化，字段类型当前为 social.SocialClient；两个接口当前 ApplyFriend 方法签名一致，结构兼容，不能认定编译错误，建议统一 socialclient.Social 并去除未用pb导入。API逻辑待实现，指导从context字符串userId解析正整数，调用SocialRpc.ApplyFriend；HTTP不接收申请人ID。仅静态检查未构建/启动。

### P5-05 API 调用逻辑复核

已核对 API ApplyFriendLogic 从JWT context取userId、ParseInt转正整数、映射FromUserId并调用SocialRpc、处理错误及返回Id，ServiceContext 类型已统一socialclient.Social。生成types及POST /api/social/friend/apply路由匹配，路由启用WithJwt。静态未发现新的明显问题；未构建或请求测试。social API入口尚无UnauthorizedCallback，无效JWT默认401可能为空正文。下一步用户构建user/social RPC与social API，重启user RPC使GetUser生效，启动social RPC8081和API8889，使用有效JWT验证正常和异常申请；数据库索引/表实际存在仍待验证。

### P5-07 收到的好友申请列表开始

用户要求开始实现列表。已读参考 social/rpc/internal/logic/friendputinlistlogic.go、social/api/internal/logic/friend/friendputinlistlogic.go 与当前social.proto/model。指导先定义 ListFriendApplicationsRequest(user_id,page,page_size)、FriendApplication(id,from_user_id,message,status,created_at,updated_at)、ListFriendApplicationsResponse(list,total)，新增Social.ListFriendApplications。查询本项目明确按to_user_id过滤，默认展示收到的各状态申请；空列表成功，不照搬参考空列表报错或user_id筛选。后续API从JWT传入user_id，分页默认20上限100，Model自定义列表和计数，无新表或中间件。本轮仅指导，未修改业务/生成/构建；之前真实申请联调结果未确认。

### P5-07 列表协议已生成，指导 Model 扩展

已核对 social.proto、socialclient 及 listfriendapplicationslogic.go 骨架存在，RPC列表逻辑仍为空，Model尚无列表/计数方法。下一步用户在friendrequestmodel.go接口和customFriendRequestModel增加FindReceived(ctx,userId,limit,offset)与CountReceived(ctx,userId)；固定to_user_id条件、updated_at DESC,id DESC排序，占位符传参；空列表初始化非nil切片，分页参数由下一步RPC校验转换。仅检查与指导，未修改业务或构建。

### QueryRowsCtx 教学核对与更正

已读本地go-zero1.10.3 core/stores/sqlx/sqlconn.go和orm.go。QueryRowsCtx(ctx,v,query,args...)返回error，将多行结果填入切片指针；严格映射列数少于结构字段会返回ErrNotMatchDestination。更正此前“选择部分列仍直接QueryRowsCtx到完整FriendRequest保持零值”的指导：该情况需QueryRowsPartialCtx，或定义仅包含所选列的专用结构。未修改代码/构建。

### P5-07 Model 完成静态核对，指导 RPC 列表

FindReceived/CountReceived 已存在且接口声明一致，to_user_id过滤、占位参数、排序及全列QueryRowsCtx匹配正确。listfriendapplicationslogic.go仍为空。指导用户增加ID校验、page=0默认1/page_size=0默认20，拒绝负值和每页>100；int64计算offset，调用计数/列表，映射全部响应字段，空列表成功。仅指导未修改业务/构建；API列表尚未开发，count与list两次查询不保证并发瞬间完全一致。

### P5-07 列表 RPC 实现复核

已核对 ListFriendApplicationsLogic：正数用户ID校验、0值分页默认1/20、每页1..100、int64偏移计算、CountReceived/FindReceived调用、空切片及全部响应字段映射正确，UserServer/socialclient已衔接。Model过滤to_user_id、计数条件一致，时间/id倒序及SQL参数顺序正确。本轮静态未发现明显问题；未构建、发请求或核实数据库。API仍只有申请POST，没有列表GET，前端尚无列表。下一步用户构建social RPC后增加JWT保护的收到申请HTTP接口。count和list分别查询，并发时总数与当前页可能有短暂差异；当前不做事务快照。

### P5-08 API 文件审阅

social.api 新列表定义尚有错误：第43行响应名称未完成且缺右括号；GET page/pageSize应使用form标签和默认值而非json；Status当前string建议int32匹配RPC，Total当前int32建议int64；条目可补createdAt/updatedAt。Applications字段名称合法，与RPC List可以由logic映射。JWT组及HTTP不接受userId正确。当前生成types/routes只包含申请接口，列表未生成，不能称API已完成。原申请类型已更名Req/Resp，需核对现有logic使用同名。只读审阅未改代码/生成/构建。

### P5-08 API 定义再次复核

social.api 列表GET响应名/括号、form默认分页标签、Status int32、Total int64均已修正，JWT组正确。FriendApplication未含createdAt/updatedAt，属可选字段取舍，不是语法错误。生成types/routes仍无列表，listfriendapplicationslogic.go尚不存在；下一步用户重新goctl api go后实现逻辑。未生成/构建。

## 2026-10-06 API列表审阅

API生成文件已有JWT GET列表路由，逻辑尚有类型与响应转换错误：records是RPC响应，需遍历records.List并构造[]types.FriendApplication，返回Applications和records.Total。当前HTTP不含时间字段，不调用RPC整数时间的Unix。仅静态检查，未构建或联调。详见今日任务 docs/tasks/2026-10-06.md。

## P5-08 修正复核

API ListFriendApplicationsLogic 已改为遍历records.List、构造[]types.FriendApplication并返回Applications/Total，错误Unix调用和未使用social导入均已移除。JWT身份解析、分页传入、生成types和JWT GET路由一致。静态未发现明显问题；代理未构建/发请求。下一步用户构建并重启social API/RPC，携带接收人JWT GET /api/social/friend/applications?page=1&pageSize=20，核对空列表和本人隔离，P5-08保持待验证。

## 2026-10-06 收到的好友申请前端

用户授权完善该功能前端。依据 apps/social/api/social.api 和实际 API ListFriendApplicationsLogic，HTTP GET /api/social/friend/applications?page=1&pageSize=20，响应 applications:[{id,fromUserId,message,status}],total。当前HTTP不返回时间或昵称，不自行伪造这些字段。

修改 web/src/types/social.ts、api/social.ts、components/UserProfile.tsx、pages/AuthPage.css，新增 components/ReceivedFriendApplications.tsx。登录后自动查询本人收到的申请，展示申请编号、申请人ID、附言和状态（待处理/已接受/已拒绝），支持刷新、上一页/下一页、每页10/20/50条和总数。空列表和失败重试有明确反馈；页数缩减时回到有效页，切换每页数量回第1页，旧查询通过AbortController取消，避免旧数据覆盖。列表GET只传page/pageSize，自动附带JWT，不发送userId。前端没有接受或拒绝操作，不应将状态显示误认为已实现处理接口。

实际验证：node node_modules/typescript/bin/tsc 成功；node node_modules/vite/bin/vite.js build 成功。复用已有依赖，未安装或修改包版本。环境自带Playwright及本机Edge模拟API测试通过：列表和JWT请求头/无userId、三个状态、空附言、分页/页容量、刷新后页码回退、纯文本503/重试、空列表、空401退出、390px无横向溢出；手机截图 web/received-applications-mobile-check.png 已检查。模拟请求未访问实际API/数据库；真实接收用户隔离与分页联调待用户验证。

本机已有3000开发服务，尝试另启动因端口占用退出，未停止用户进程；浏览器通过既有服务验证。真实联调时用接收用户登录，检查该列表只展示发给自己的记录，确认数据库total及分页。现有Vite双API代理无需改动，生产Nginx配置仍见部署文档。

## P5-09 接受/拒绝好友申请开始（规划）

已阅读参考 social/rpc/internal/logic/friendputinhandlelogic.go：接受时更新申请并插入双向好友关系使用事务；本项目需补仅接收人可处理和status=0条件更新，避免照搬参考权限缺失及错误判断。当前没有friend表/模型和处理协议。第一步用户创建 apps/social/rpc/models/friend.sql，字段id/user_id/friend_user_id/created_at，唯一(user_id,friend_user_id)，每对好友存A→B及B→A两行。接受计划同一sqlx事务更新申请status1并插入两行，失败回滚；拒绝只把本人待处理申请置status2。后续新增RPC/API，API身份取JWT。当前仅规划与指导，未创建业务文件/建表/生成/构建，P5-09待办，之前真实联调继续待确认。

## P5-09 单向删除设计分析

用户询问双向两行的单方面删除。公开参考腾讯云Chat关系链管理 https://www-sg.tencentcloud.com/document/product/1047/33521 ：支持Delete_Type_Single与Delete_Type_Both；该行为不代表微信/QQ内部数据库结构。当前设计若16删17，仅删除(user_id=16,friend_user_id=17)，保留反向行；双方解除则事务删除两行。两行适合每人独立通讯录/备注，并非唯一最佳实践；若产品只允许对称关系可采用标准化用户对单行。单向删除后的发送权限需另行定义，不能仅检查发送人的好友行；旧friend_request.status=1是申请处理历史，不能据其认定当前仍为好友，未来重加必须修改ApplyFriend已接受分支并按实际关系判断。删除/发送权限/重加行为尚未实现或确定，本轮仅分析未改业务。

## P5-09 建表反馈与协议下一步

用户反馈SQL执行完成，记录为用户反馈；本机friend.sql及friendmodel.go/friendmodel_gen.go已存在且唯一(user_id,friend_user_id)，代理未连接数据库验证。当前social.proto还没有处理方法。下一步用户新增HandleFriendApplicationRequest(id,user_id,status仅1/2)、Response(id,status)及RPC，user_id由API JWT传入。后续实现仅接收人处理status0并采用sqlx事务建立双向关系，未生成/构建。

## P5-09 处理协议骨架核对

HandleFriendApplication协议和logic骨架已存在，业务为空。FriendModel已生成但ServiceContext尚未接入。下一步用户添加FriendModel models.FriendModel及models.NewFriendModel(conn)，复用同一数据库连接；随后自定义带status=0/to_user_id条件更新及sqlx事务，确保状态变更与双向关系原子完成。本轮只指导未改业务/生成/构建。

## P5-09 条件状态更新指导

已确认FriendModel在svc初始化并复用conn。下一步用户扩展FriendRequestModel.UpdatePendingStatus(ctx,session,id,userId,status) (bool,error)，UPDATE条件id/to_user_id/status=0；session非nil使用事务ExecCtx，nil使用普通连接，检查RowsAffected==1。logic负责输入status仅1/2及区分不存在/非接收人/已处理；接受时更新和插入双向好友行必须使用同一session。方法未实现，代理未改业务/构建，本轮读本地sqlx.Session和TransactCtx签名确认。并发处理同一申请只有一次可从0改为目标状态，不提前承诺跨方向申请一致性。

## 2026-10-07 处理RPC指导

UpdatePendingStatus已存在，处理logic仍为空。下一步校验接收人和状态，使用同一事务session修改申请并在接受时插入双向好友；已有用户对唯一冲突不重复新增关系，其他错误回滚。仅指导未实现或构建，API和前端处理按钮尚未接入。

## P5-09 简化接受事务指导

当前处理logic已写参数/权限/状态校验和事务条件更新，但事务行误写err:=（同作用域已定义err），末尾忽略事务错误返回空响应，接受时尚未插入好友。用户要求易懂版本，指导FriendModel增加CreatePair(ctx,session,用户A,用户B)，排序后单条INSERT两行ON DUPLICATE KEY UPDATE id=id，已有关系保持原样；logic事务只更新状态并在接受时调用CreatePair。保留同session、条件更新、错误回滚和实际ID/状态响应。方法未创建，代理未修改业务/生成/构建。下一步用户依指导完善两文件并构建；运行和并发验证待完成。

## P5-09 RPC已实现，进入HTTP协议

静态核对处理RPC已实现校验、接收人权限、待处理状态、TransactCtx条件更新/接受CreatePair、错误映射及实际响应；CreatePair接口实现一致，双向单SQL并使用事务session。未构建/数据库验证。FriendModel注释错误：排序只固定两行写入顺序降低死锁风险，不保证所有user_id小于friend_user_id，也不负责去重（唯一索引负责）。下一步用户在social.api添加HandleFriendApplicationReq(path id,json status)、Resp(id,status)，JWT组PUT /api/social/friend/applications/:id，然后goctl api go。HTTP不接受userId，后续由ctxJWT解析；未生成或改业务。

## P5-10 处理API logic指导

已核对pkg/ctxdata/user.go的GetUserID存在，生成HandleFriendApplicationReq/Resp和socialclient处理方法存在。当前API logic有身份与重复参数校验但未调用RPC，指导简化为GetUserID→SocialRpc.HandleFriendApplication→映射Id/Status，RPC保留参数/权限校验。生成Req.Id当前json标签，需与实际HTTP路径核对，使用/:id时应在.api改path标签再生成，不能手改types。仅指导未改业务或构建。

## P5-10 处理API静态完成，下一步联调

已确认social.api和生成Req.Id均为path标签，POST /api/social/friend/applications/:id路由已生成并在JWT组，API logic使用ctxdata.GetUserID调用处理RPC并映射Id/Status，静态未发现明显问题。下一步用户构建并重启social API/RPC，携带接收人JWT对不同待处理记录分别status1接受/status2拒绝；接受核对申请状态1及friend双向两行，拒绝状态2且不新增关系，验证第三人不能处理及已处理不能重复。本轮未构建或发请求，前端处理按钮未接入。

## P5-11 好友列表Model复核

已核对FriendModel.FindByUserID/CountByUserID接口及实现一致；分页按user_id过滤、id倒序、limit/offset参数顺序正确，查询全列friendRows匹配Friend结构，初始化空切片，计数条件一致。静态未发现明显问题，未构建或查询数据库。页码/大小校验仍由后续RPC负责。第54行ON DUPLICATE注释“更新已存在的好友关系”不准确：id=id保持原样。下一步定义好友列表proto，尚未核对/实现用户批量查询与昵称组合。接受/拒绝实际测试仍待确认。

## P5-11 好友列表协议指导

当前social.proto没有ListFriends。已读参考social/rpc/internal/logic/friendlistlogic.go，沿用user_id查询关系，本项目sqlx分页并允许空列表，不照搬空列表报错。下一步用户新增ListFriendsRequest(user_id,page,page_size)、FriendInfo(id好友关系ID,friend_user_id好友用户ID,name,created_at)、ListFriendsResponse(list,total)和ListFriends。昵称后续RPC通过用户服务补充，API身份由JWT传入。仅指导未改协议/生成/构建，好友列表logic待实现。

## P5-11 昵称查询及当前列表问题

已检查用户GetUser RPC返回Id/Name，无需新增单独获取昵称方法；social已有UserRpc客户端。ListFriendsLogic分页与Model调用已存在，但Name为空、返回空响应导致list/total未返回，getFriendNames残留UserRpc.未完成表达式，当前不能编译。指导复用GetUser，补助手方法与循环调用，返回List/Total。先按当前最小实现逐个获取，后续如页大/延迟再考虑批量，不能宣称批量已实现。本轮仅指导未改业务/构建，已注销用户残留关系需后续明确展示或清理规则。

## P5-11 批量用户查询选择

用户选择getFriendNames([]int64)返回map。当前User只有GetUser，无批量RPC/Model。指导先在user.proto新增GetUsersRequest(repeated ids)、UserInfo(id,name)、GetUsersResponse(repeated users)、User.GetUsers；随后Model单条IN占位查询、RPC限制最多100个正数ID并允许空列表/缺失用户，social辅助方法一次RPC构造ID→昵称map，空ids不调用。当前只是方案/代码指导，未生成或实现；用户SQL密码字段不可返回，不能将for内逐个RPC当批量查询。最终好友循环按关系顺序取map，缺失名称处理待实现时明确，不改变total语义。

## P5-11 FindByIDs 卡点审阅

当前UserModel已声明FindByIDs，实现在IN(?)传[]int64且误用ExecCtx、残留records=，无法编译。指导按ids长度构造?列表与[]any参数，QueryRowsCtx填入初始化[]*User，全列userRows与User字段匹配，空ids返回空切片不执行SQL；无需新导入。GetUsersLogic仍为空实现且空ids返回nil,nil，后续须返回空GetUsersResponse而非nil。仅指导未改业务/构建。RPC响应只映射Id/Name，不返回PasswordHash等字段。

## P5-11 批量查询前置核对

UserModel.FindByIDs占位列表和QueryRowsCtx已实现正确；GetUsersLogic仍未查询Model，空ids返回nil,nil，好友helper残留未完成表达式，好友List/Total未返回。指导先补GetUsersLogic：空ids返回空Users，最多100个正ID，调用FindByIDs后只映射UserInfo.Id/Name，不返回手机号/密码哈希；再继续好友批量昵称辅助方法。仅指导未改业务/构建。

## P5-11 批量昵称链路审阅

用户GetUsers已实现空响应、100上限、正ID校验、FindByIDs及仅Id/Name映射；生成server/client已接入。social ListFriends已批量收集好友ID调用GetUsers并map补昵称，返回List/Total。建议修正：主方法将helper全部错误改为Internal会丢失Unavailable，改return err；helper空ids直接空map避免空好友列表依赖用户RPC；GetUsers缺失ID返回少量记录不会NotFound，移除复制的申请人/目标错误提示。缺失nameMap项当前空昵称，建议显示用户不存在并保留关系/total，避免删掉行破坏分页。SQL注释仍写语法错误可修文字，不影响执行。只读审阅未改业务/构建，批量查询/好友实际测试待确认。

## P5-11 批量好友列表再次复核

已确认getFriendNames空ID返回空map、不调用RPC，RPC错误原样返回且ListFriends不覆盖错误码；缺失ID显示“用户不存在”，List/Total按关系返回。用户GetUsers与FindByIDs校验/占位符/映射正确。本轮静态未发现明显问题，未构建/运行；SQL注释“导致语法错误”仍不精确，仅文字问题。下一步用户构建user/social RPC并重启user加载GetUsers，接入好友列表HTTP。好友列表真实隔离、分页及用户不存在测试待完成。

- [ ] P5-10：接受/拒绝API已静态核对，真实测试及前端按钮待确认。
- [ ] P5-11：好友列表RPC与用户批量查询已静态核对，构建/联调待确认；API定义有分页请求和Friends/Total响应但缺GET路由，待用户补齐并生成。

本轮核对social.api：ListFriendsReq form分页默认值、FriendInfo字段类型、ListFriendsResp合法；缺@handler listFriends和GET /api/social/friends。CreatedAt未定义并非语法错误；它是响应字段，是否展示与“无需前端填写”无关，如要返回时间需在FriendInfo添加CreatedAt int64 json标签。未执行生成/构建，业务文件未改。

下一步用户补JWT组GET路由，按需补CreatedAt，再goctl api go；随后实现API logic从JWT获取身份调用ListFriends。

## P5-11 好友列表API logic审阅

已核对ListFriendsLogic从ctxdata取JWT身份、分页调用SocialRpc、错误原样返回、映射Friends/Total和非nil空列表正确，生成GET /api/social/friends在JWT组。唯一明确遗漏：API FriendInfo已定义CreatedAt，但logic第51行结构体未赋值，HTTP会返回0；应增加CreatedAt: record.CreatedAt，不调用Unix（RPC已返回秒数）。ID异常检查可保留，不是必须添加更多重复校验。仅静态审阅未改业务/构建，下一步用户补字段后构建并验证HTTP分页与时间。

## 2026-10-08 前端处理申请与好友列表（WEB-05）

用户授权完善前端，修改仅限web及文档。依据当前social.api，新增 api/social.ts 的 handleFriendApplicationApi（POST /api/social/friend/applications/:id，正文仅status）、listFriendsApi（GET /api/social/friends?page=&pageSize=）；types/social.ts加入处理响应与好友列表类型。

ReceivedFriendApplications.tsx对待处理申请提供接受、拒绝按钮，拒绝需行内确认并可取消；使用ref阻止重复提交，操作期间禁用其他处理/分页/刷新。成功依据服务响应更新状态并刷新申请；接受后通知父组件刷新好友，失败保留状态并显示错误，退出后不更新已卸载界面。已处理记录不展示操作按钮。

新增 FriendsList.tsx，UserProfile.tsx挂载“我的好友”：显示昵称、好友用户ID、添加时间（Unix秒转换本地日期）；0或无效时间显示暂未提供，避免显示1970日期。支持刷新、分页、每页10/20/50、空列表与错误重试；旧查询取消，数据减少回有效页。无聊天/删除好友按钮，后端对应接口尚未提供。

验证命令：node node_modules/typescript/bin/tsc、node node_modules/vite/bin/vite.js build，均通过。环境自带Playwright+本机Edge模拟API测试通过：接受后好友刷新、拒绝确认/取消、操作互斥、POST路径/正文/JWT、失败不假改状态、好友列表分页/页容量、时间缺省、错误重试/空列表、390px无横向溢出、401清会话。截图web/friends-mobile-check.png已检查。没有真实API/数据库写入、没有修改Go业务或生成构建Go代码。

开发服务已由代理启动于http://127.0.0.1:3000。真实联调待用户启动当前版本user RPC、social RPC与两API，使用接收人账号接受申请后核对friend双行、列表昵称/时间，拒绝核对status2、不新增关系，测试第三人和重复处理。前端通过模拟测试不代表后端事务和权限运行已验证。
# 2026-10-08 单向删除好友审阅（P5-12，待修正/验证）

P5-13重新申请代码已静态核对：ApplyFriend使用FriendModel.FindOneByUserIdFriendUserId(fromID,toID)，本方关系存在即AlreadyExists，不查对方残留方向；本方无关系后，旧申请status1或2调用Reopen(ctx,id,expectedStatus,message)变为0，待处理仍拒绝。Reopen仅当状态等于查询值时更新，0影响行返回Aborted；接口/调用/SQL参数一致，初次插入仍保留唯一索引1062处理。复用申请行会更新附言与updated_at、保留created_at，原来已接受/拒绝的状态会被覆盖，不是完整历史审计。无需改proto或部署。静态通过，尚未Go构建/真实验证；跨当前关系查询与申请更新并非同一事务，不能声称防住全部并发场景。下一步用户验证单向删除→重新申请→接受补回一行，对方原行保留。

最新API核对：HTTP定义和生成文件已接入 `DELETE /api/social/friends/:friendUserId`，路由 `rest.WithJwt`；API DeleteFriendLogic从ctxdata.GetUserID获取操作者，SocialRpc.DeleteFriend传UserId和路径FriendUserId，错误原样返回，成功JSON例如 `{ "friendUserId": 17 }`。不需要请求正文或客户端提交操作者。当前API→RPC→Model链路静态一致；未执行Go构建/运行验证。由用户在项目根目录执行 `go build ./apps/social/api/... ./apps/social/rpc/...`，重启当前版本服务，以A令牌删除B，核对friend中A→B删除、B→A保留；重复删除预期NotFound、无令牌401、本人ID或非正数InvalidArgument。前端删除与删除后重加仍待开发，不能宣称全流程已验证完成。

后续复查：DeleteFriendLogic第37行已修正为userId,friendUserId，第34-36行加入禁止删除自己，现有Model/RPC单向删除静态一致。未执行构建或真实删除，API尚未定义，下一步接JWT保护的DELETE /api/social/friends/:friendUserId。上文/下文初次审阅的倒置问题作为历史记录保留，不代表当前代码仍存在该问题。

当前 `apps/social/rpc/social.proto`、生成server/client与DeleteFriendLogic已存在；`models/friendmodel.go` 自定义DeleteByUserID按用户对条件删除，并使用RowsAffected返回是否删除一条关系。RPC将数据库错误映射Internal、0行映射NotFound，成功返回FriendUserId。第34行目前参数反转，传friendUserId,userId，会删除对方持有的关系；正确顺序应userId,friendUserId，因此尚不能认定单向删除已正确实现。仅静态核对，未修改Go或执行构建/真实删除。

调用设计：可信API从JWT取操作者→SocialRpc.DeleteFriend→DeleteByUserID→`delete from friend where user_id=? and friend_user_id=?`；HTTP接口尚未加入。后续应验证A删除B仅影响A→B，B→A保留、无关系返回NotFound、无效ID返回InvalidArgument。已有ApplyFriend status=1仍直接拒绝再次申请，删除后重加需要单独调整，不应删除申请历史。参考此前已阅读参考项目social_model.go的有向用户对模型；未发现专用删除逻辑，不声称照搬其删除实现。本项目沿用sqlx而非参考GORM；无新增部署组件。
