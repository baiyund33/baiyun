# 会话交接

最后更新：2026-10-11（Asia/Shanghai）。

## 快速入口

- 工作目录：`E:\code\baiyun`
- 开发约定：[AGENTS.md](../../AGENTS.md)
- 总任务：[ROADMAP.md](ROADMAP.md)
- 今日任务：[2026-10-11.md](2026-10-11.md)
- 当前阶段：P1/P2 正常 Ping 调用链已通过（用户反馈）；P3 基础 CRUD 的服务器验证、登录鉴权待继续。

## 最新核对（2026-10-11）

- 用户反馈超时并授权重启：已核对监听进程和go run父进程，只停止本项目4个RPC/API与im WS并重新隐藏启动；前端未动。8080/8081/8888/8889/8890实际PID34948/7984/23420/18040/32340，stderr均空，用户API→RPC200、WS无令牌401。新日志清单C:\Users\29417\AppData\Local\Temp\baiyun-runtime-20261011-070328；NO_PROXY=*仅新进程继承，配置未改。未确认超时根因；WS60秒无消息会关闭，重启后客户端须重新连接，真实回显仍未验证。

- 用户授权启动所有后端：user RPC8080/social RPC8081/user API8888/social API8889已启动并确认监听，原im WS8890（PID30888）复用。新进程NO_PROXY=*，未改YAML/持久环境。真实user API→RPC Ping200，social无令牌401 JSON；未替用户登录或读取令牌。启动日志与进程清单C:\Users\29417\AppData\Local\Temp\baiyun-runtime-20261011-061840，实际RPC/API PID15216/23760/7880/23988。下一步用户localhost:3000登录保存会话后重试WS回显；回显仍未确认。

- 回显测试截图阻碍：读取localStorage时报SecurityError，发生在new WebSocket之前，尚不能判断WS握手失败。只读端口检查仅8890监听、未见3000，前端页面访问失败；指导用户在web目录npm run dev，打开http://localhost:3000正常登录后重试。127.0.0.1与localhost存储不同且前者不在当前来源白名单。不修改浏览器安全设置或业务代码。

- P6-01：用户已写Upgrader和串行回显，JWT/Origin/子协议/64KiB限额/超时/Close静态正确。下一步用户自行构建启动im/ws8890，从localhost:3000登录后浏览器控制台用会话JWT连接、发送、核对原文并关闭。代理未构建/启动/真实握手。未完成任务迁入10-11，详细现状见im-websocket.md；MongoDB/心跳/转发仍待实现。

## 2026-10-09 核对记录（历史）

- wsConnectHandler已接JWT与用户context，AllowedOrigins配置含localhost:3000；仍httpx.Ok未升级。下一步指导在handler声明Upgrader（仅baiyun子协议/来源白名单/5秒握手），替换Ok为Upgrade及串行ReadMessage/WriteMessage回显，64KiB限额/60秒读空闲/10秒写超时/退出Close；不写普通HTTP响应到升级后的连接。仅指导，未改代码或构建。

- P6-01下一步：已核对wsConnectHandler仍未鉴权，指导先调用authenticateWS，失败httpx.WriteJson401并return，成功将字符串userId放入派生context后交给原logic。此步骤仍返回普通HTTP200，升级尚未实现，不加无法直接接受浏览器自定义头的标准jwt路由。代理未改业务或构建。

- wsauth.go已实现并静态核对：读取baiyun/JWT两项子协议，限定HS256验证签名和exp必需/未过期，字符串userId解析正整数，返回身份或错误。wsConnectHandler尚未调用它，所以当前/ws仍未鉴权或升级。未构建/真实握手；下一步handler先鉴权失败401，通过后来源校验与Upgrade，只协商baiyun。

- P6-01握手鉴权指导：gorilla依赖已安装，当前wsConnectHandler仍普通HTTP。下一步用户创建wsauth.go，从Sec-WebSocket-Protocol的baiyun/JWT两项验证HS256签名、必需exp与正数userId，之后handler再调用并升级；仅指导，未修改业务/构建。未来服务端仅协商baiyun协议，不回显JWT。

- P6-01最小收发开始：用户已补Config.Auth和AllowedOrigins，YAML密钥字段存在（未输出/验证具体值），wsConnectHandler仍普通HTTP。已读参考websocket/server.go确认使用gorilla/websocket；当前go.mod无gorilla，下一步用户根目录go get github.com/gorilla/websocket，再实现握手鉴权/升级/回显。不执行go mod tidy以免尚无导入时移除新依赖；代理未改业务/安装/构建。

- 学习约定：按用户要求在AGENTS.md加入“其余知识边开发边学”，每步只先讲当前必需基础，实际用到时结合代码补充；不省略当前正确性/安全性要求。业务未改，下一步仍为WebSocket鉴权/升级与最小收发流程。

- P6-01继续：已核对im.api改为wsConnect、生成wsconnecthandler.go，端口已8890；Auth配置尚无。下一步用户在Config增加Auth.AccessSecret、AllowedOrigins，在im.yaml配置与用户API相同密钥及localhost:3000来源。浏览器WS不能直接自定义Authorization头，后续明确设计握手认证，不直接宣称加jwt路由即可。未修改业务或运行构建。

- P6-01骨架复查：用户已创建im.api并生成im.go、etc/im.yaml、config/svc/handler/logic；GET /ws衔接正确，目前Connect返回nil、handler返回普通HTTP200，尚无WebSocket升级/JWT。配置Port8888与user API冲突，应用户改8890。未构建/启动新服务；下一步先改端口，再接JWT鉴权及WS升级。文档见 [WS服务骨架](../development/im-websocket.md)。

- P6-01：用户继续到聊天准备，当前尚无im/ws代码。已读参考WS入口/路由/JWT认证，参考使用自定义websocket.Server；本项目先用.api→goctl api go建立HTTP握手骨架，再实现WS升级，避免一次搬入复杂参考架构。MongoDB暂不引入。新每日任务保留原未完成编号并更新实际状态，好友真实测试仍未确认。仅指导/维护任务记录，未创建业务文件或运行生成。

## 2026-10-08 核对记录（历史）

- WEB-10/P5-12/P5-13：用户授权完善并启动前后端。前端接入好友详情单向删除/确认/错误/刷新；社交API加入中文401，新增friendflow_test.go验证删除方向与重加/反向申请规则。Go回归测试、四服务构建、前端构建及模拟UI通过。四后端已运行8080/8081/8888/8889，复用Vite http://localhost:3000；实际HTTP页面/Ping200、社交无令牌查询和删除401 JSON。启动进程级NO_PROXY=*，不改YAML或用户持久环境。日志进程清单在临时baiyun-runtime-20261008-194717目录，详细路径见 [单向删除好友](../development/social-friend-delete.md)。未对真实云数据库删除或造账号；下一步用户用两个账号核对单向删除→重加→接受，聊天尚未开发。

- “已是好友仍能反向申请”已被P5-13现有关系检查覆盖，无需新增判断：接受CreatePair创建A→B/B→A，因此B申请A时查(B,A)即AlreadyExists。单向删除后仅删除者可重加，保留关系者仍拒绝。只读核对代码，未重复改业务或运行请求；用户可用B账号向已接受的A申请验证。跨并发建立关系的竞态仍未整体串行化。

- P5-13静态复查通过：ApplyFriend先查fromID→toID当前关系，存在拒绝，ErrNotFound继续；case1/2调用Reopen(id,f.Status,message)，接口/SQL参数匹配且WHERE检查expectedStatus、RowsAffected判断成功，唯一索引1062处理保留。未执行构建/真实请求，待用户验证单向删除后重加与重复申请。前端删除尚未接入；页码并发变化与跨流程并发关系检查仍非事务整体保证。

- P5-13具体修改指导已给：使用已有FindOneByUserIdFriendUserId(fromID,toID)判断本人关系，case1/2合并重开；Reopen新增expectedStatus参数作为WHERE条件并传f.Status，保持并发影响行数判断。仅一处调用需改；未修改Go或构建，待用户实现后审阅。

- 好友闭环缺口复核：ApplyFriend仍只查同方向申请，case1无条件拒绝；单向删除后可能不能重加，反方向已建立好友但无同方向已接受记录时也可发冗余申请。下一步优先完善现有ApplyFriend：先按fromID→toID查当前friend关系，存在拒绝；不存在则允许旧status1条件重开，Reopen仍只支持status2需调整。属于待实现建议，未改业务。通知按updated_at排序+offset滚动的并发遗漏风险可后续游标化。

- P5-12 API静态核对通过：DELETE /api/social/friends/:friendUserId在WithJwt组，path请求类型一致；DeleteFriendLogic从ctxdata.GetUserID获取操作者，正确传UserId与FriendUserId，错误原样返回并映射响应。RPC/Model单向条件仍正确。未运行构建或真实请求；下一步用户构建social API/RPC，以A令牌删除B并确认仅A→B消失、B→A保留。前端删除与删除后重新申请规则尚未实现。

- P5-12再次复查：RPC第37行已正确按userId,friendUserId调用Model，第34-36行增加不能删除自己；单向删除静态检查通过。未执行构建/真实删除。social.api尚无DeleteFriend，下一步用户在JWT组增加DELETE /api/social/friends/:friendUserId及请求/响应类型，再goctl api go生成并实现从ctxdata获取操作者。

- P5-12删除RPC审阅：生成协议/server/client已衔接，FriendModel.DeleteByUserID的SQL和RowsAffected正确；deletefriendlogic.go第34行传参倒置（friendUserId,userId），会删除对方→自己的记录，必须改为(userId,friendUserId)。仅静态审阅，未改Go/构建/真实删除；建议增加不能删除自己的参数校验。API删除尚未接入，删除后旧已接受申请仍阻止再次添加，后续需调整。

- P5-12：用户确认单向删除；已核对social.proto存在DeleteFriend请求/响应和RPC声明，deletefriendlogic.go尚未生成，model仍无按用户对删除方法。下一步用户从根目录运行goctl rpc protoc（含--name-from-filename）生成骨架，随后增加条件删除及RowsAffected判断。本轮仅核对/指导，未生成或构建。

- 下一开发项P5-12删除好友：实际social.proto/API/model当前没有删除好友专用方法；本轮仅指导先定义协议，建议单向删除本人关系，操作者由API从JWT获取。未修改业务或执行goctl。后续需处理旧已接受申请与重新申请的关系，真实社交联调未确认；前端WEB-09模拟验证不能代替后端验证。

- WEB-09：好友通知已改无限滚动，每批20条，失败重试保留累计列表，点击入口重置第一页；接受/拒绝仅更新该记录、保留其他通知，接受仍刷新好友。构建和模拟浏览器检查通过（含处理中点击入口延后重查、小屏、401），真实联调待用户验证。后端不变，细节见web-auth.md；下一步在localhost:3000核对真实通知列表。

- WEB-08：刷新按钮已移除，点击“联系人”重载好友第一页；点击/再次点击“好友通知”刷新申请当前页，消息页通知入口同样有效。接受后自动刷新、无限滚动与失败重试保留。构建及生产预览模拟请求次数测试通过，真实联调待确认。下一步用户在localhost:3000点击相应入口验证。

- WEB-07：好友列表已改为无限滚动，沿用page/pageSize后端接口，每批20位，追加去重、失败同页重试、刷新重置、末页停止；搜索为已加载数据过滤，搜索时可手动加载。修改FriendsList、DesktopWorkspace搜索提示及CSS，构建和模拟分页浏览器检查通过，390px截图已检查；没有Go/配置变更，真实联调待用户验证。下一步刷新前端核对真实列表；聊天和删除好友仍待开发。细节见 [web-auth.md](../development/web-auth.md)。

- WEB-06：按QQ PC截图改为白云桌面布局（账号栏/导航/好友侧栏/内容区），保留申请、处理和个人资料功能，新增当前页好友过滤与资料选择。TypeScript/Vite构建及模拟Edge浏览器检查通过，390px无横向溢出；真实联调仍待用户验证。访问 http://localhost:3000，登录后查看；聊天仍待开发。文件、截图与验证见 [web-auth.md](../development/web-auth.md)。下一步优先确认此前登录RPC EOF已解决，再用两个真实账号核对申请/接受/好友列表；用户要求继续后再指导删除好友功能。

- WEB-05 已接入接受/拒绝与我的好友列表，TypeScript/Vite构建及模拟浏览器测试通过。Go代码/运行配置未修改，真实事务和权限联调待用户验证；开发服务 http://localhost:3000，细节见web-auth.md。下一步接收人真实处理申请并核对好友列表与数据库。


- P5-11：好友列表API类型已写，缺JWT组GET路由；CreatedAt可选响应字段，不由前端传入。下一步补路由并生成，真实RPC/API验证待完成。未完成项迁入2026-10-08。

## 2026-10-07 核对记录（历史）

- P5-09：UpdatePendingStatus已实现且静态正确；处理RPC仍为空。指导同sqlx事务更新状态/接受插入双向好友，等待用户实现与构建；未完成项迁入2026-10-07。

## 2026-10-06 核对记录（历史）

- WEB-04 收到申请前端已实现列表/状态/分页/刷新/错误与空状态，TypeScript/Vite构建及模拟浏览器测试通过。列表API响应转换已由用户修正并静态核对，后端真实联调尚未确认；下一步用接收人账号核对本人数据与分页，再开发接受/拒绝接口。


- 当前 P5-08：API列表骨架已生成，逻辑误将RPC响应当切片、误用RPC类型和Unix转换，未构造最终HTTP响应；需用户按本轮指导修正。未执行构建或运行，未完成项迁入2026-10-06。

## 2026-10-05 核对记录（历史）

- WEB-03 前端完善与好友申请已完成代码和构建；模拟浏览器测试通过，真实后端联调待验证。新增表单、双API代理，修复错误正文/会话同步/密码字节校验。下一步从 http://localhost:3000 登录并向其他已有用户发起申请；细节见 docs/development/web-auth.md 和 docs/deploy/web.md。


- 前端工程全面重构 WEB-02：应用户要求根据最新后端代码全面重构与 apps 同级的 web 目录。覆盖 Ping、Register、Login、UpdateUser (选填跳过)、DeleteUser，实现全套原生 SVG 矢量动画（多层浮云、微风描边发光 Logo、Spinner、Checkmark、Alert 三角），支持 JWT Bearer 维持、401 失效拦截及个人中心仪表盘；同步更新 docs/development/web-auth.md 并生成交互演示 artifact。未执行 npm install/build。
- 用户确认上轮测试全部完成，基础用户功能暂告一段落（用户反馈，代理未独立测试）。当前转入 P5-01 好友申请表设计，由用户编写 apps/social/rpc/models/friend_request.sql；SQL/model/RPC/API 尚未创建或验证。历史 HTTPS 等待办继续保留。

- P3-15 修改指导已具体化：API Name/Phone optional；usermodel.go 的 UserModel 增加 UpdateFields 并由 customUserModel 实现固定列名的动态 SET；RPC只校验ID，保留FindOne，移除全字段对象赋值并调用新方法，错误映射不变。仅指导未修改，待用户实现和测试。
- 最新需求为修改用户时空字段跳过而不报错。核对当前 .api Name/Phone 必填，RPC 任一空即InvalidArgument，生成 model Update 写全部资料及密码。下一步 P3-15 调整 optional、仅校验ID并跳过空字段；建议自定义model只更新非空字段，避免并发覆盖。规则建议全部空时确认用户存在后成功返回ID，不执行SQL；当前只是分析，业务未改。
- API user.go 已加入 WithUnauthorizedCallback 返回401 JSON，文件核对存在，实际响应结果待验证。

## 2026-10-04 核对记录（历史）

- 最新用户验证：登录成功返回用户信息和JWT；无令牌修改接口截图返回401空正文，拒绝符合预期。未复制令牌，代理未独立发请求。用户关心缺少中文JSON提示，默认JWT未授权处理需自定义回调后才能提供统一正文；其余权限异常测试待确认。
- 当前阻碍：用户本机启动后 Postman Login 返回 RPC连接DeadlineExceeded。本机8888/8080监听，API从云端etcd user.rpc发现地址；工具环境HTTPS_PROXY已设置、NO_PROXY为空，运行API环境未知。先由用户在启动环境NO_PROXY=*并重启API；仍失败临时本机Endpoints直连隔离发现问题。不要把此错误归因密码/JWT，尚未修复验证。
- 最新复查：旧 POST /api/user 路由已在 .api 和 routes.go 中移除；RPC Update 已把1062转换为AlreadyExists，其他Update错误为Internal。更新/删除JWT及本人权限仍在。两处修复代码核对通过，未执行构建或请求测试；下一步用户构建并验证旧路径、重复手机号和JWT异常流程。
- API/RPC 两端审阅：JWT 路由与更新/删除本人检查已存在，RPC Update 保留密码哈希，Delete 检查影响行数。剩余公开 POST /api/user 旧 CreateUser 入口应从 .api 移除；Update 重复手机号需映射 AlreadyExists。Compose 未发布 RPC8080，仅发布 API8888，RPC维持内部可信调用。默认 httpx gRPC→HTTP 映射已源码确认（401/403/404/409），未执行运行验证。
- 文档后续修订：day09 JWT与请求context.md 已替换简化代码，使用 go-zero Authorize 实际片段，按用户要求用简单语言说明 WithValue 不修改旧 context、WithContext 返回请求副本、ServeHTTP 向后传递。只改文档，未构建或修改业务。
- 按用户 /eli5 要求创建 docs/development/baiyun/day09 JWT与请求context.md，已读实际登录签发、JWT routes、handler、update/delete 本人权限及 go-zero 1.10.3 Authorize 源码。更新/删除已启用 rest.WithJwt，update 本人检查已存在，不再沿用此前“未接入”的推断；仅静态核对，运行验证仍待确认。未改业务代码或运行构建，未完成任务迁入今日文件。

## 2026-10-03 核对记录（历史）

- 当前 P3-14：已核对 go-zero authhandler 会把 userId 自定义 claim 放入 context；指导在 .api 用 jwt: Auth 保护修改/删除，并在 logic 比较 token userId 和路径 Id，防止越权。旧创建 HTTP 入口计划移除、注册取代。尚未改文件或生成，JWT 路由/本人权限当前仍未实现。
- JWT 签发已写入 API LoginLogic，仅在 RPC 登录成功后使用 HS256 和 Auth.AccessSecret，返回 AccessToken/AccessExpire；.api/生成 types 一致。仅静态检查，未构建或运行。下一步 P3-14 验证令牌后配置路由鉴权和本人操作权限；JWT payload 不加密，禁止写入密码。
- JWT 配置复查通过：API Auth 结构和 YAML 配置一致、AccessExpire=7200，密钥存在非占位，未打印或验证随机性。LoginResp 仍只有 Id/Name。下一步 P3-13 扩展响应、生成结构、API 成功登录后签发 HS256 JWT，userId 用字符串避免大整数精度问题；鉴权尚未接入，未执行构建。
- 前端工程最新创建：应用户要求在与 apps 同级新建 web 目录，生成基于 React 18 + TypeScript + Vite 的登录与注册前端工程。API 封装对齐 apps/user/api/user.api，包含类型定义、登录/注册组件与表单规则校验、页面切换、样式和 Vite 反向代理配置（代理 /api 至 8888 端口）。开发文档已补充 docs/development/web-auth.md，未执行 npm install 或构建。
- 下一步 JWT 配置 P3-12：指导用户在 API Config 和 YAML 增加 Auth.AccessSecret/AccessExpire。签发计划位于 API，密钥不传 RPC、不输出日志；当前未修改业务或配置。登录请求测试结果仍未提供。
- 登录 API 最新审阅：POST /api/user/login 定义、生成结构及 API UserRpc.Login 调用一致，成功返回 Id/Name；RPC 密码原样校验并统一错误提示。静态未发现衔接错误，未构建或调用。下一步测试密码登录，再新增 JWT 返回字段、Auth 配置、签发及接口鉴权。
- 注册 API 最新复查：user.api 已加入 RegisterReq/Resp、POST /api/user/register；types/handler/routes 已生成，API logic 调用 UserRpc.Register 并返回 Id，静态一致。未构建或测试；下一步用户验证注册后接 HTTP 登录/JWT。旧 /api/user 仍为 CreateUser，不等同于注册。
- RPC Register/Login 已有 bcrypt 和一致的禁止空白规则；Register 1062 映射已存在。API 实际只有 Ping/CRUD，没有注册登录 HTTP 定义或 logic。下一步 P3-10 先新增注册 HTTP，goctl 生成，再实现 API → RPC；之后登录/JWT。未执行生成或构建，未完成任务迁入今日文件。

## 2026-10-02 核对记录（历史）

- 当前 1062 截图排查：Register 错误映射存在，CreateUser 仍直接返回数据库错误；HTTP /api/user 仍调用 CreateUser，注册 HTTP 尚未新增。截图无请求方法，实际路径待确认；若调用 Register 需核对部署版本和旧 RPC 实例。代理未修改业务或部署。
- 最新核对：登录已保留原始密码并统一错误提示，新增 ContainsAny 拒绝空格/制表符/换行；注册尚未加同一限制，需同步规则。下一步定义 API Register/Login 请求响应及路由，LoginResp 预留 AccessToken/AccessExpire，由后续 API 签发 JWT。已只读核对 goctl api go 帮助，未生成或构建。
- 登录最新审阅：LoginLogic 已查询手机号并使用 CompareHashAndPassword，返回 ID/Name。仍需修复密码 TrimSpace（与注册不一致）及统一用户不存在/错误密码提示。下一步用户修复并验证；JWT 和注册登录 HTTP 仍待接入，未构建。
- 注册最新复查：1062 错误映射已写入，与 bcrypt 保存和密码原样/72 字节检查一致，静态未发现阻塞问题；代理未构建或调用。下一步用户构建并验证注册正常/重复/无效密码，再实现 LoginLogic（目前占位）。
- 注册最新进度：已核对 PasswordHash: string(hash)、原始密码和 72 字节上限，crypto v0.54.0 校验记录已存在。剩余 Insert 重复手机号映射待用户完成：errors.As 到 *mysql.MySQLError，Number=1062 返回 AlreadyExists；未构建或请求验证。
- bcrypt 排查：导入写法正确，只读 go list -mod=readonly 返回 missing go.sum entry。用户需执行 go mod tidy；本地缓存有 crypto 目录不代表当前模块已具备依赖记录。Register 已生成 hash，但 Insert 仍写 Password 且 hash 未用，下一步改 PasswordHash: string(hash)。代理未修改业务或执行 tidy/构建。
- 最新注册审阅：模型已生成 PasswordHash，Register/Login 协议与 server/client 已生成；Register 当前把密码明文写入 PasswordHash，并 TrimSpace 修改密码，重复手机号直接返回数据库错误。登录仍占位，API 未加注册登录。下一步 P3-05 修复注册，详见 docs/development/user-auth.md；代理未改代码或构建，实际数据库 ALTER 结果仍待确认。
- 注册登录进度：已核对 user.sql 存在 password_hash，生成模型尚无 PasswordHash；数据库 ALTER 结果待确认。只读检查 goctl 1.10.2 的 ddl 帮助，下一步由用户执行 model mysql ddl。自定义 Delete 在 usermodel.go，生成后核对保留；代理未生成或构建。
- 当前工作转为 P3 注册、登录：用户确认用户服务正常后要求开始。已核对 user.sql/proto/api，当前无密码字段或注册登录方法；已读参考注册、登录及 bcrypt 调用。下一项为 P3-01，指导用户新增 password_hash 并迁移数据库，代理不改业务代码或执行生成。用户确认的 CRUD 正常流程记为反馈通过，异常流程仍待专门验证。
- 用户提供服务器镜像构建输出，随后确认部署完成，并在 Ping 验证指导后确认“无误，且通过postman测试”。API → RPC 正常调用和外部 HTTP 访问记录为通过，来源为用户反馈；代理未连接服务器，未记录为独立实测。数据库 CRUD、异常流程和最终镜像详情仍待核实。
- 最新请求：给服务器另一份 /data/by/docker-compose.yml 增加 etcd。已提供 components/etcd/docker-compose.yml 片段及部署说明，SERVER_IP 需替换，单节点 2379、数据目录 /data/etcd/data。未修改 baiyun 应用 Compose，未访问服务器；先检查旧 etcd，不能把新实例配置当作恢复方案。
- 最新 Compose 已按用户提供的文件风格调整：固定容器名 baiyun-user-rpc/baiyun-user-api、restart: always、列表格式 TZ 和短格式 :ro 挂载。保留 build 和共享默认网络，仅发布 API 8888。两个配置源文件当前存在；服务器上传后需再次检查。此前长格式挂载的 create_host_path: false 已移除，相关说明以本条和部署文档为准。未执行 Docker 校验或部署。
- 本轮已创建根 docker-compose.yml：user-rpc 和 user-api 分别从根上下文构建，只读挂载各自 YAML，默认共享网络，仅发布 API 8888，配置缺失时不创建目录；API depends_on RPC 仅控制顺序。云端中间件仍使用既有部署。
- 实际核对 RPC 也已为 golang:1.26.8 单阶段，本轮未修改 Dockerfile。部署文档已修正。本机无 Docker、Python 缺少 PyYAML；仅静态检查，Compose 正式校验、构建和服务器启动待执行。以下 Dockerfile 结构记录为历史。
- 用户本轮要求重新编写 API Dockerfile，已改为 golang:1.26.8 单阶段，在 /app 内编译和运行 user-api；端口 8888，配置仍挂载到 /app/etc/user.yaml。RPC Dockerfile 保持两阶段。静态检查通过，本机无 Docker CLI，镜像未构建。
- 以下“两文件统一”是本日较早记录，当前 API 以本条单阶段版本为准。
- 用户要求部署在 Ubuntu，通过 docker-compose.yml 统一构建和启动，且 Dockerfile 尽量简单。现已将两个 Dockerfile 统一为 golang:1.26.8 编译、alpine:3.23 运行，去掉阶段名称，用 --from=0 复制程序。
- 简化版无缓存挂载、构建变量和普通用户创建；保留 CGO_ENABLED=0、GOOS=linux、证书和时区、端口以及配置启动路径。当前运行层默认 root。
- .dockerignore 仍排除配置目录，YAML 后续通过 Compose 只读挂载提供。仓库当前尚无 Compose 文件；编写 Compose 是下一步。
- 只静态核对，未执行构建或部署；历史未完成任务迁入新一天，保持原编号。

## 2026-10-01 核对记录（历史）

- 新增、更新和删除的 RPC/API 代码及 SQL model 已存在，用户要求暂不新增查询接口。历史 HTTP 测试返回 MySQL 1062，证明当时请求到达数据库，不能计为全部 CRUD 成功；更新和删除的 405 已指导使用 /api/user/:id。
- 用户明确要求根据 Java Dockerfile 编写 Go 部署文件。本轮完成 apps/user/rpc/Dockerfile、apps/user/api/Dockerfile 和根 .dockerignore；运行配置通过只读挂载提供，不进入镜像。
- 已创建 [部署索引](../deploy/README.md) 和应用、MySQL、Redis、etcd 部署记录。构建镜像 1.26.8-alpine3.23，运行镜像 alpine:3.23。镜像构建、服务器运行、组件版本和数据卷仍待验证。
- 本机只读 go version 为 1.26.7；执行环境未找到 Docker CLI，代理未执行生成、应用构建、镜像构建或部署。

## 2026-09-30 核对记录（历史）

- RPC Ping 已返回 `"hello, " + in.GetName()`；MySQL 和 Redis 配置及 ServiceContext 初始化已存在，业务读写尚未实现。
- API 已有 goctl 1.10.2 骨架，POST `/api/user/ping`。Config 定义 UserRpc，ServiceContext 创建 userclient.User，API PingLogic 调用 RPC 并映射 Message，实际文件均已核对。
- 用户说明 etcd 部署在云服务器。API 和 RPC 使用同一云端 etcd、Key 为 user.rpc。API 的旧 Endpoints 已注释。
- go.sum 已存在 MySQL 驱动和 JWT 校验记录。代理未执行本轮构建、生成或启动；没有完整构建成功输出。
- 用户 HTTP 请求曾返回 503，错误显示连接经过本机 7890 代理。只读核对发现 HTTPS_PROXY 指向该代理，8080 和 8888 当时均监听。已指导 API 终端设置 NO_PROXY 后重启，未收到最终 HTTP 200 响应。
- NO_PROXY 固定地址列表需要覆盖 etcd 返回的实际 RPC 地址；临时联调可以设置为 `*`。
- GoLand 文档加载故障已由日志定位：Goctl 1.2.3 与 Jzero 1.1.0 重复注册 api 语言。已指导禁用 Jzero 并重启，恢复结果待确认。
- MySQL 查询、Redis 业务操作未验证；组件版本、部署方式和数据卷位置尚未核实。开发文档：[用户 API 调用 RPC](../development/user-api.md)。

## 历史记录（不代表最新状态）

- Go 模块：`baiyun`。正式协议：`apps/user/rpc/user.proto`，`package baiyun.user`，`go_package = "./user"`。
- goctl 1.10.2 已生成 `apps/user/rpc` 骨架。入口为 `user.go`，配置为 `etc/user.yaml`，pb 文件位于 `user/`。
- `internal/logic/pinglogic.go` 当前由用户编写返回 `"hello, " + in.GetName()`；尚未构建或调用验证。用户要求回滚的代理旧代码并未恢复。
- `etc/user.yaml` 当前监听 `0.0.0.0:8080`，用户已将 etcd 地址改为远程主机。2026-09-30 用户启动服务时，连接远程 etcd 超时并导致进程退出；Ping 尚未完成调用验证。
- 生成骨架后曾构建通过。代理写入的 Ping 版本曾通过临时客户端调用验证，但已撤回；该结果不代表当前代码已实现 Ping。没有已知正在运行的用户服务。

## 协作方式与下一步

用户亲自编写业务代码和修改运行配置；代理只指导、解释、审阅和排错。除非用户明确要求代理动手，不主动修改代码、配置或执行生成与构建。开发/部署文档仍按 `AGENTS.md` 的要求随实际实现维护。

下一步：由用户构建 API/RPC，验证 POST /api/user/register、POST /api/user/login 正常和异常流程，再接入 JWT。当前登录仅返回 Id/Name；数据库迁移执行记录、运行结果尚未确认。

## 2026-10-05 部分更新代码复核

已只读核对 user.api、生成 types、API UpdateUserLogic、routes、RPC UpdateUserLogic 和 models/usermodel.go：Name/Phone 已 optional，RPC 仅要求 ID>0，TrimSpace 后空值跳过；UpdateFields 只写入非空的 name/phone，参数通过占位符传递，不写 password_hash。全部字段为空时，RPC 先查询用户存在，再不执行更新并返回 ID。JWT 路由和本人权限判断仍保留。

代码已存在，P3-15 的构建和运行验证仍待用户执行。代理未生成、构建或启动。下一步在项目根目录执行 go build ./apps/user/api/... ./apps/user/rpc/...，重启两服务，携带本人登录令牌测试仅姓名、仅手机号、空对象、纯空白和重复手机号。先查后更新仍有并发删除窗口，本次未作严格并发存在性保证。


### P5-01 路径排错

只读检查发现 SQL 实际在 apps/user/rpc/models/friend_request.sql，apps/social/rpc/models 不存在。用户的 goctl 命令指向不存在的 social 路径，因此生成失败。下一步由用户创建 social/rpc/models，并将 SQL 移入，再执行原 goctl model 命令；代理未移动文件或运行生成，数据库建表状态未确认。

### P5-01 Model 已生成，进入 P5-02

已核对 apps/social/rpc/models 下 SQL、friendrequestmodel.go、friendrequestmodel_gen.go、vars.go 均存在。数据库实际建表仍待确认，代理未构建。下一步用户创建 apps/social/rpc/social.proto，定义 Social.SendFriendRequest，请求包含 from_user_id、to_user_id、message，响应 request_id。from_user_id 后续由 API 从 JWT 获取，不信任 HTTP 请求提供的身份。通过 goctl rpc protoc 和 --name-from-filename 生成骨架；本轮只检查帮助，未执行生成。

### P5-02 骨架核对

已核对 social.proto 和 RPC 骨架均存在：协议 baiyun.social、go_package ./social、方法 ApplyFriend，响应字段 id；internal/logic/applyfriendlogic.go 仍为空实现。Config 和 ServiceContext 仅有基础配置，数据库未接入，未构建。下一步用户在 internal/config/config.go 添加 Mysql.DataSource，再配置 YAML 和初始化 FriendRequestModel。参考 social/rpc/internal/config/config.go、internal/svc/servicecontext.go，本项目沿用已选 sqlx，暂不引入参考 CacheService/GORM。proto 复制来的 user 注释需改为 social。

### P5-02 配置复核

Config.Mysql.DataSource 和 YAML Mysql.DataSource 已存在（凭据未输出）。ServiceContext 声明 MysqlConn，但初始化写 MsqlConn，字段拼写不一致会导致编译错误；FriendRequestModel 尚未初始化。social.yaml ListenOn 8080 与用户 RPC 默认端口相同，同机启动需为 social 改用独立端口（指导 8081）。仅静态审阅，未构建、连接数据库或修改配置。下一步用户修正拼写、初始化 model、调整端口后构建。

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


## WEB-03 前端完善与好友申请

用户明确授权修改 web。已增加 FriendApplication、api/social.ts、types/social.ts，好友请求走 /api/social/friend/apply，使用JWT、不发送申请人ID；Vite分流用户8888和好友8889。修复共享请求重复读取错误正文、401清理后页面状态未同步、登录手机号丢失，注册密码按UTF-8 72字节校验；完善小屏和错误/加载反馈、账户删除说明。业务修改仅在web，Go代码与运行配置未修改。

实际执行 node node_modules/typescript/bin/tsc、node node_modules/vite/bin/vite.js build 成功；用环境自带Playwright和本机Edge模拟接口验证自申请、成功参数和JWT、纯文本409、空401退出、中文密码、手机号同步及390px布局均通过。未执行真实后端联调。截图 web/friend-mobile-check.png 已检查。开发服务 http://127.0.0.1:3000 当前由代理启动供查看。

同步 docs/development/web-auth.md、web/README.md、docs/deploy/web.md 和索引。下一步用户启动两API和RPC后真实网页登录/申请，核对数据库记录；随后开发申请列表与处理接口，不能把模拟测试当作后端验证。

### 联调 RPC 代理故障

用户反馈 Unavailable，server preface读连接127.0.0.1:7897被关闭。只读检查当前环境 HTTPS_PROXY=http://127.0.0.1:7897、NO_PROXY未设置；8080/8081/8888/8889均监听。错误连接已显示经过代理，指导在启动Go服务的PowerShell设置 NO_PROXY=* 并重启；GoLand需各运行配置环境变量设置，不能假定终端环境会修改已运行进程。代理未修改环境或重启。若仍失败继续核对etcd登记的服务地址，监听存在不等于健康。

### P5-06 真实申请联调待执行

当前只读确认3000、8080、8081、8888、8889监听，不能据此认定调用成功；此前7897代理连接错误恢复结果尚未收到。下一步用户从前端登录，用另一位已有用户ID发送申请，核对friend_request行及重复申请提示。实际通过后再开发收到的申请列表；架构保持现状，本轮未合并API或新增接口。

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


## P5-09 简化接受事务指导

当前处理logic已写参数/权限/状态校验和事务条件更新，但事务行误写err:=（同作用域已定义err），末尾忽略事务错误返回空响应，接受时尚未插入好友。用户要求易懂版本，指导FriendModel增加CreatePair(ctx,session,用户A,用户B)，排序后单条INSERT两行ON DUPLICATE KEY UPDATE id=id，已有关系保持原样；logic事务只更新状态并在接受时调用CreatePair。保留同session、条件更新、错误回滚和实际ID/状态响应。方法未创建，代理未修改业务/生成/构建。下一步用户依指导完善两文件并构建；运行和并发验证待完成。

## P5-09 RPC已实现，进入HTTP协议

静态核对处理RPC已实现校验、接收人权限、待处理状态、TransactCtx条件更新/接受CreatePair、错误映射及实际响应；CreatePair接口实现一致，双向单SQL并使用事务session。未构建/数据库验证。FriendModel注释错误：排序只固定两行写入顺序降低死锁风险，不保证所有user_id小于friend_user_id，也不负责去重（唯一索引负责）。下一步用户在social.api添加HandleFriendApplicationReq(path id,json status)、Resp(id,status)，JWT组PUT /api/social/friend/applications/:id，然后goctl api go。HTTP不接受userId，后续由ctxJWT解析；未生成或改业务。

2026-10-07：按用户明确授权，仅修正 friendmodel.go 的 CreatePair 排序注释为“固定双向关系的写入顺序，降低并发死锁风险”。已核对注释，业务代码不变；未构建。

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


## P5-11 好友列表API logic审阅

已核对ListFriendsLogic从ctxdata取JWT身份、分页调用SocialRpc、错误原样返回、映射Friends/Total和非nil空列表正确，生成GET /api/social/friends在JWT组。唯一明确遗漏：API FriendInfo已定义CreatedAt，但logic第51行结构体未赋值，HTTP会返回0；应增加CreatedAt: record.CreatedAt，不调用Unix（RPC已返回秒数）。ID异常检查可保留，不是必须添加更多重复校验。仅静态审阅未改业务/构建，下一步用户补字段后构建并验证HTTP分页与时间。


## 2026-10-08 前端处理申请与好友列表（WEB-05）

用户授权完善前端，修改仅限web及文档。依据当前social.api，新增 api/social.ts 的 handleFriendApplicationApi（POST /api/social/friend/applications/:id，正文仅status）、listFriendsApi（GET /api/social/friends?page=&pageSize=）；types/social.ts加入处理响应与好友列表类型。

ReceivedFriendApplications.tsx对待处理申请提供接受、拒绝按钮，拒绝需行内确认并可取消；使用ref阻止重复提交，操作期间禁用其他处理/分页/刷新。成功依据服务响应更新状态并刷新申请；接受后通知父组件刷新好友，失败保留状态并显示错误，退出后不更新已卸载界面。已处理记录不展示操作按钮。

新增 FriendsList.tsx，UserProfile.tsx挂载“我的好友”：显示昵称、好友用户ID、添加时间（Unix秒转换本地日期）；0或无效时间显示暂未提供，避免显示1970日期。支持刷新、分页、每页10/20/50、空列表与错误重试；旧查询取消，数据减少回有效页。无聊天/删除好友按钮，后端对应接口尚未提供。

验证命令：node node_modules/typescript/bin/tsc、node node_modules/vite/bin/vite.js build，均通过。环境自带Playwright+本机Edge模拟API测试通过：接受后好友刷新、拒绝确认/取消、操作互斥、POST路径/正文/JWT、失败不假改状态、好友列表分页/页容量、时间缺省、错误重试/空列表、390px无横向溢出、401清会话。截图web/friends-mobile-check.png已检查。没有真实API/数据库写入、没有修改Go业务或生成构建Go代码。

开发服务已由代理启动于http://127.0.0.1:3000。真实联调待用户启动当前版本user RPC、social RPC与两API，使用接收人账号接受申请后核对friend双行、列表昵称/时间，拒绝核对status2、不新增关系，测试第三人和重复处理。前端通过模拟测试不代表后端事务和权限运行已验证。

## 2026-10-08 登录RPC EOF排错

用户前端登录返回Unavailable/server preface EOF。只读确认用户API8888与RPC8080均有Go进程监听，Vite用户代理指向8888；UserRpc配置云etcd key user.rpc。工具环境HTTPS_PROXY指向7897，NO_PROXY缺失，启动Go进程实际环境未确认，优先指导在实际启动终端NO_PROXY=*后重启。若仍失败临时用户API使用Endpoints127.0.0.1:8080替代Etcd以隔离云端登记旧地址，之后恢复发现并核对实际登记地址。未修改配置、环境、重启或发登录请求，尚未确认修复。
追加证据：只读检查用户API进程52980的TCP连接，确认存在到127.0.0.1:7897的Established连接。优先在实际启动环境设置NO_PROXY=*并重启用户API，不能只改无关终端。
