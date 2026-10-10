# 用户注册与登录

2026-10-03 审阅：部分实现，未构建或调用验证。目标为 HTTPS 传输、bcrypt 校验、API 登录成功后签发 JWT；RPC 注册登录逻辑、两个 HTTP 调用及 JWT 签发已存在，接口鉴权尚未接入。

## 参考与分层

参考 go-zero-im/easy-im-master/go-im 的 apps/user/rpc/internal/logic/registerlogic.go、loginlogic.go、apps/user/api/internal/logic/user/loginlogic.go 和 pkg/encrypy/hash.go。借鉴 RPC 处理账户和 bcrypt 校验，当前项目使用 goctl model + sqlx，计划由 API 签发 JWT。未复制参考中的错误用户存在判断、旧用户变量签发 token 或密码请求日志。

## 当前文件与调用链

- apps/user/rpc/user.proto：RegisterRequest(name/phone/password)、RegisterResponse(id)，LoginRequest(phone/password)、LoginResponse(id)。
- apps/user/rpc/internal/server/userserver.go：Register 创建 RegisterLogic 并转发请求。
- apps/user/rpc/internal/logic/registerlogic.go：修剪 name/phone，保留原始密码，校验非空及 72 字节上限，bcrypt 生成哈希后 Insert、LastInsertId、返回 ID。
- apps/user/rpc/internal/svc/servicecontext.go：初始化 UserModel。
- apps/user/rpc/models/user.sql、usermodel_gen.go：password_hash、uk_phone；Insert 已包含 PasswordHash。
- apps/user/rpc/internal/logic/loginlogic.go：已实现按手机号查询、处理查询失败、bcrypt 校验和返回用户 ID/Name；目前 TrimSpace 修改密码及错误提示不一致，待修复。
- apps/user/api/user.api：已有 RegisterReq/Resp、POST /api/user/register，LoginReq/Resp 和 POST /api/user/login；LoginResp 当前只有 Id/Name。
- apps/user/api/internal/logic/loginlogic.go：调用 UserRpc.Login，密码原样传递，错误向上返回，成功映射 Id/Name。
- apps/user/api/internal/logic/registerlogic.go：使用原始 Password 调用 UserRpc.Register，透传错误，映射返回 Id。
- apps/user/api/internal/handler/registerhandler.go、routes.go、internal/types/types.go：生成的请求解析、POST 路由及字段均与 .api 一致。

调用链：HTTP POST /api/user/register → registerHandler → API RegisterLogic.Register → UserRpc.Register → RPC UserServer.Register → RPC RegisterLogic.Register → UserModel.Insert → MySQL → sql.Result.LastInsertId → 响应 id。RPC 方法 /baiyun.user.User/Register。

## 审阅问题与下一步

JWT 签发最新审阅：LoginResp 在 .api 和生成 types 中均含 AccessToken/AccessExpire；API 先调用 RPC，成功后 NewWithClaims(HS256, MapClaims) 构造令牌对象，SignedString 使用 Auth.AccessSecret 的字节生成最终 JWT；字段 userId 为字符串、iat/exp 为 Unix 秒，与响应过期时间一致。依赖 jwt/v4 v4.5.2 已为直接依赖。静态衔接正确，未构建或运行；有效期和密钥还需启动校验，鉴权未配置。NewWithClaims 不签名，SignedString 生成 header.payload.signature，编码不等于加密；exp 必须在验证时检查才起作用。

JWT 配置最新复查：API Config.Auth 和 YAML 的 Auth.AccessSecret/AccessExpire 一致，有效期 7200 秒，密钥存在且非占位，未输出密钥或判定随机性。尚无签发代码或令牌响应字段。下一步 LoginResp 增加 AccessToken/AccessExpire，再由用户生成类型并使用现有 jwt/v4 签发 HS256，payload 包含字符串 userId、iat、exp；仅成功密码登录后签发。JWT 无密码字段，生成令牌不等于接口鉴权已接入。

后续核对：登录已改为原始密码，统一 Unauthenticated 提示，ContainsAny 拒绝普通空格/制表符/回车/换行；注册尚未同步禁止空白的规则，可能产生无法登录的账户。下一步先同步注册校验，再定义 API 请求响应与路由；计划 LoginResp 返回 Id/Name/AccessToken/AccessExpire（过期 Unix 秒），由 API 签发 JWT。这些 HTTP 定义尚未写入文件，不记为完成。

登录审阅：先 FindOneByPhone、未找到返回 Unauthenticated、其他数据库错误返回 Internal、CompareHashAndPassword 校验的顺序正确。注册保留原始密码，登录却 TrimSpace，带前后空格的合法注册密码无法正确匹配；改用 in.GetPassword()。用户不存在提示“手机号或密码错误”，密码失败提示“密码错误”，应统一避免暴露账户存在性。LoginResponse 协议已添加 name=2，需与生成 pb 一致；JWT 仍待 API 接入。未构建或调用验证。

最新复查：Insert 错误分支已使用 errors.As 提取 MySQLError，1062 返回 AlreadyExists（手机号已注册），其余返回 Internal（注册失败）。与 bcrypt 保存和密码原样校验一起，当前基础注册逻辑静态检查未发现阻塞问题。未构建、未请求验证；下一步由用户构建，并测试新手机号、重复手机号、空密码和超过 72 字节密码，然后实现 LoginLogic。

最新文件核对：前两项已修复，PasswordHash 使用 string(hash)，密码未 TrimSpace，已增加 72 字节上限。go.mod/go.sum 已有 golang.org/x/crypto v0.54.0 和 MySQL 驱动 v1.10.0 完整条目；未执行构建，不代表运行验证通过。剩余重复手机号映射由用户修改 Insert 后的错误分支，导入 errors 和 mysql 驱动，以 errors.As(err, &mysqlErr) && mysqlErr.Number == 1062 返回 AlreadyExists，其余返回 Internal。当前自动生成 ID，表唯一业务键只有 uk_phone，所以该映射对应手机号；以后增加其他唯一键需区分。

以下为此前问题记录：

后续导入排查：registerlogic.go 的 bcrypt 导入写法正确；当前 go.mod 没有显式 crypto 依赖，go.sum 仅见旧 go.mod 校验条目。只读执行 go list -mod=readonly golang.org/x/crypto/bcrypt 返回 missing go.sum entry，包解析失败已确认，不是单纯 IDE 索引推断。由用户执行 go mod tidy 补依赖。当前已增加 GenerateFromPassword 并保留原始密码，但 Insert 仍用 PasswordHash: Password，hash 未使用；需改 string(hash)。未替用户执行 tidy 或修改代码。

1. PasswordHash 当前直接赋值 Password，实际保存明文；必须先 bcrypt.GenerateFromPassword，再存 string(hash)。字段名不产生自动哈希效果。
2. 不应 TrimSpace 修改密码；使用原始 GetPassword，检查非空与 bcrypt 72 字节上限，长度策略另定。name/phone 可按约定修剪。
3. 数据库 uk_phone 防止重复，但插入错误目前直接返回；捕获 MySQL 1062，返回 codes.AlreadyExists，其余数据库错误用稳定的 Internal 提示。只预查手机号不能处理并发注册竞争。
4. 当前 LastInsertId 及其错误检查正确。SQL 文件更新与 model 生成已核对，实际 ALTER TABLE 仍未收到结果。

用户亲自修改注册逻辑，导入 bcrypt 后执行 go mod tidy、go build ./apps/user/rpc/...，由用户运行。代理本轮只审阅并维护文档，不修改业务代码或执行构建。

## 验证与限制

2026-10-04 登录 DeadlineExceeded 排查：实际本机 8888 和 8080 均有监听，API 经云端 etcd 的 user.rpc 发现 RPC。当前工具环境 HTTPS_PROXY 已设置且 NO_PROXY 为空，存在 gRPC 走代理的风险；并未读取运行中 API 的环境，不能据此断言实际进程环境。指导在 API 启动终端设 NO_PROXY=* 后重新启动，GoLand 启动则在运行配置设置。若仍失败，临时由用户改 API UserRpc.Endpoints=[127.0.0.1:8080] 并移除该客户端 Etcd 段，隔离发现问题；不要同时保留两种方式或把临时直连当部署配置。两实例共用云端 Key 可能发现旧/容器 RPC 地址，实际发布地址尚未查询。代理仅检查配置、端口和环境存在性，未重启或改配置。

两处问题最新复查：user.api 和生成 routes.go 均已移除公开 POST /api/user；旧 CreateUser Go 文件和 RPC 方法虽保留，但无 HTTP 路由。RPC Update 已使用 errors.As 判断 MySQLError.Number=1062，返回 AlreadyExists（手机号已被使用），其他 Update 错误返回 Internal。更新/删除的 JWT 路由和本人权限保持存在。静态检查正确，未构建或测试；下面“待完善”两项是此前记录，本次已由实际文件确认修复，运行验证仍待执行。

2026-10-04 API/RPC 两端审阅：API 更新/删除路由已启用 rest.WithJwt，logic 在调用 RPC 前读取字符串 userId 并比较路径 Id；RPC Update 先 FindOne 再修改 Name/Phone，保留密码哈希；Delete 自定义实现检查 RowsAffected 并映射 NotFound。两端静态衔接正确，未构建或运行。

待完善：公开 POST /api/user 仍调用旧 CreateUser，绕开密码注册并创建空 PasswordHash 账户，应在 .api 移除该路由后重新生成；不要直接编辑 routes.go。Update 遇到重复手机号直接返回数据库错误，应与注册一样处理 MySQL 1062，返回 AlreadyExists。RPC 不验证外部用户 JWT，当前 Compose 仅发布 API 8888，RPC 8080 留在应用网络，应继续限制为可信内部调用。

已核对 go-zero 1.10.3 httpx/responses.go 与 rest/internal/errcode/grpc.go：当前默认 ErrorCtx 会将 gRPC Unauthenticated→401、PermissionDenied→403、NotFound→404、AlreadyExists→409；响应体仍为文本。此前“需核对 HTTP 映射”已得到源码确认，但不计运行实测。

下一项（待实施）：.api 使用 @server(jwt: Auth) 保护更新/删除，生成 routes 的 rest.WithJwt 使用 Auth.AccessSecret；公开注册/登录不加鉴权。API logic 从 context 读取字符串 userId，缺失返回 Unauthenticated，与路径 Id 不同返回 PermissionDenied，然后才调用 RPC。两者分别负责身份验证与本人权限，均需实现；当前未修改或测试。旧无密码 CreateUser HTTP 入口由 Register 替代。测试无/过期/篡改 token、本人及他人 ID；HTTP 错误映射仍需另核对，不假定 PermissionDenied 自动成为 403。

最新登录 API 审阅：.api、types、loginHandler 和 routes 中 POST /api/user/login 一致，API→RPC 调用和返回映射正确；RPC 已查询手机号、bcrypt 校验并统一失败提示。未构建或测试。由用户验证正确密码、错误密码、未注册手机号及空字段。当前没有 AccessToken/AccessExpire、Auth 配置或 JWT 签发，登录仅验证凭据，尚不建立后续访问认证。HTTPS 和统一 HTTP 错误映射也仍待接入。

2026-10-03 静态核对 API 注册定义、types、handler、路由、逻辑及 ServiceContext 一致，未发现调用衔接错误。未运行构建或 HTTP 测试。由用户执行 go build ./apps/user/api/...，部署时更新 API/RPC，使用测试手机号注册再重复请求；正常应返回 id，重复应收到手机号已注册的 RPC 错误。当前 httpx.ErrorCtx 使用默认处理，未实现统一 HTTP 错误映射/JSON 错误体，不把 gRPC AlreadyExists 当作已映射 HTTP 409。旧 POST /api/user 仍调用 CreateUser。

重复手机号排查：用户截图仍为原始 MySQL 1062。实际 Register 已映射 AlreadyExists，但 CreateUserLogic 仍 return nil, err；当前 HTTP POST /api/user 调用 CreateUser，注册 HTTP 路由尚未存在。因此测试旧创建接口不会触发 Register 的处理。若直接调用 gRPC Register 仍收到原始 1062，应核对是否重启或重建 RPC，以及 etcd 中是否仍有旧实例；截图没有提供方法，未断言实际请求路径。

使用已部署 MySQL/Redis/etcd，见 ../deploy/mysql.md、redis.md、etcd.md。项目根目录启动 RPC：go run ./apps/user/rpc -f apps/user/rpc/etc/user.yaml；服务器更新由 Compose 构建部署。

待测：新手机号注册返回 ID、数据库保存 bcrypt 哈希；重复手机号 AlreadyExists；空密码和超过 72 字节密码 InvalidArgument；带前后空格的密码保持原样；密码不进入响应或日志。已经写入的明文 PasswordHash 无法用于 bcrypt 正常验证，测试账户需重置密码或重建，不能据字段名当作已安全存储。

HTTPS、JWT、限流、密码重置、邮箱验证均未实现，不把当前 RPC 写库当作注册登录功能完成。[bcrypt 官方说明](https://pkg.go.dev/golang.org/x/crypto/bcrypt)。

## 2026-10-05 部分更新代码复核

已只读核对 user.api、生成 types、API UpdateUserLogic、routes、RPC UpdateUserLogic 和 models/usermodel.go：Name/Phone 已 optional，RPC 仅要求 ID>0，TrimSpace 后空值跳过；UpdateFields 只写入非空的 name/phone，参数通过占位符传递，不写 password_hash。全部字段为空时，RPC 先查询用户存在，再不执行更新并返回 ID。JWT 路由和本人权限判断仍保留。

代码已存在，P3-15 的构建和运行验证仍待用户执行。代理未生成、构建或启动。下一步在项目根目录执行 go build ./apps/user/api/... ./apps/user/rpc/...，重启两服务，携带本人登录令牌测试仅姓名、仅手机号、空对象、纯空白和重复手机号。先查后更新仍有并发删除窗口，本次未作严格并发存在性保证。

### P5-03 GetUser 实现复核

已确认 user.proto、pb、userclient 和 UserServer 均包含 GetUser；GetUserLogic 校验 ID>0、调用 UserModel.FindOne、ErrNotFound 转 NotFound，成功仅返回 Id/Name。其他数据库错误直接返回，建议改为 Internal“查询用户失败”，避免原始数据库错误外露。social Config/ServiceContext 尚无 UserRpc，ApplyFriend 仍为空实现。仅静态检查，未构建或运行验证。下一步修正错误映射，再接入好友服务 UserRpc 客户端。

### P5-04 申请逻辑静态复核

ApplyFriend 已实现 ID/自申请/255字符校验、用户 RPC 查询、状态分支、条件 Reopen、新申请 Insert 和1062处理；Config.UserRpc、YAML user.rpc、ServiceContext 用户客户端和 FriendRequestModel 已一致。Reopen 条件 status=2、参数顺序及影响行数判断正确。数据库实际索引/建表及运行行为未验证。

发现 user GetUserLogic 将 ID<=0 错误改成 Internal“查询用户失败”，而数据库其他错误仍原样返回；应 ID 错误 InvalidArgument，数据库其他错误 Internal。ApplyFriend 获取新 ID 提示“获取好友申请I记录D失败”有错字。好友关系、反向申请关系校验和 HTTP/JWT 身份接入仍未实现，不能称完整好友功能完成。代理未执行生成、构建或启动；下一步用户修正后 go build ./apps/social/rpc/... ./apps/user/rpc/...，重启用户和好友 RPC，再测正常/重复/自身/不存在/重新申请。

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
