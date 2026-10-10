# Web 用户中心与好友申请

更新：2026-10-08。React 18 + TypeScript + Vite；沿用现有 SVG 与页面样式，新增真实接口调用。前端构建和模拟接口浏览器测试通过，真实后端端到端联调待验证。

## 范围与参考

依据 apps/user/api/user.api、apps/social/api/social.api、API ApplyFriendLogic 和 RPC ApplyFriendLogic。参考 go-zero-im/easy-im-master/go-im/apps/social/api/social.api 与 internal/logic/friend/friendputinlogic.go：申请人来自 JWT，前端只提交目标用户与附言。本项目用 React 表单调用 HTTP API，后端保持 goctl 分层。

已支持注册、登录、退出、选填资料修改、删除账户、Ping、发送与处理好友申请、收到申请列表、我的好友列表和单向删除好友。好友及通知列表支持无限滚动，好友支持已加载数据过滤；服务端全量搜索、聊天和实时通知尚未实现。

## 删除好友与本机启动（WEB-10，2026-10-08）

好友详情增加删除按钮及确认说明，明确只移除本方关系，对方记录保留，之后可以重新申请。deleteFriendApi使用好友用户ID而非关系ID，无请求正文，自动JWT；成功清当前对应详情、重载好友列表，失败保留好友并显示错误，取消不发请求，处理中防重复。FriendDetails支持确认焦点与Escape取消、小屏显示。Go业务已有单向删除和重加，本轮核对并增加RPC流程回归测试；社交API补中文401响应。

tsc/Vite build、Go四服务构建、RPC回归测试与模拟Edge删除UI检查通过。user RPC8080/social RPC8081/user API8888/social API8889已启动，前端复用localhost:3000；实际Ping链路200、社交无令牌查询/删除401 JSON。未执行真实数据库删除，完整记录见 [单向删除好友](social-friend-delete.md)。下方历史记录中“删除好友待开发”描述的是当时状态。

## 好友通知无限滚动（WEB-09，2026-10-08）

`ReceivedFriendApplications.tsx` 移除页码/页容量控件，沿用 `GET /api/social/friend/applications?page=1&pageSize=20`，滚动接近底部时追加下一页；IntersectionObserver观察底部在视口中的可见性，兼容桌面内容区滚动与手机页面滚动。支持键盘点击“加载更多申请”。按申请ID去重，末页或空页停止，失败保留原列表并重试原页；请求期间防重复加载，卸载/刷新取消旧请求。

点击“好友通知”从第一页重新加载，替代WEB-08当时的“当前页刷新”。接受/拒绝依据服务响应更新对应状态，保留其他已加载页面；接受后仍刷新左侧好友。查询期间禁用处理按钮，处理期间暂停加载；处理失败保留待处理状态并显示错误。处理期间点击通知入口，将重查延后到处理结束，防止旧查询覆盖操作结果。页码分页的并发遗漏限制与好友列表相同，后端未修改。

验证：在web执行tsc和Vite build通过。Playwright+Edge模拟API验证1/2/3页追加、第二页失败后保留20条并同页重试、重复ID去重、末页停止、接受/拒绝及失败保持累计列表、接受刷新好友、点击入口重置、处理时点击入口延后重查、空列表、390px无横向溢出、401退出通过，浏览器无脚本异常。检查 `web/notifications-infinite-mobile-check.png` 截图。仅模拟测试，没有真实API/数据库操作；真实联调待用户验证。

## 好友列表无限滚动（WEB-07，2026-10-08）

最新交互（WEB-08）：移除“刷新好友”和“刷新列表”按钮。DesktopWorkspace点击“联系人”增加好友refreshVersion，FriendsList取消旧请求、清空并重新加载第一页；点击“好友通知”或消息页“查看好友通知”增加requestsVersion，ReceivedFriendApplications通过refreshVersion重新查询当前页，再次点击同一入口也刷新。首次进入只由列表加载effect发起查询，不同时在点击回调发请求。接受后的自动刷新、无限滚动和失败重试保留。旧记录中的手动刷新按钮已被此入口行为替代。

WEB-08验证：在web执行tsc和Vite build通过；用生产构建预览（避免开发StrictMode初始化检查重复启动查询）及Playwright+Edge模拟API验证刷新按钮消失、联系人每次点击查询第一页一次、通知首次/重复点击/消息入口各查询一次，且两个列表刷新互不干扰。没有真实后端访问或Go代码变更，真实联调待用户验证。

替代好友列表的上一页/下一页及页容量控件。后端与接口不变，继续请求 `GET /api/social/friends?page=1&pageSize=20`，以后逐页递增。`FriendsList.tsx` 使用 IntersectionObserver（观察列表底部是否接近可见区域），桌面和小屏都以 `.desktop-sidebar` 为滚动容器；接近底部100px时自动加载，没有滚动条时继续加载直到填满可视区域。

请求期间保留已有好友，用同步ref防止重复请求；成功后追加并按关系ID去重，页码达到总页数或返回空页时停止。失败不递增页码，保留列表并提供同页重试。刷新、用户切换或接受申请后取消旧请求、清空列表、从第一页重新开始；组件卸载取消请求，旧响应不写入新列表。保留手动加载按钮便于键盘操作。搜索改为过滤已加载的所有好友，搜索期间关闭自动加载，避免一次下载全部页面；仍能手动加载更多。

`DesktopWorkspace.tsx` 更新搜索提示，`.css` 增加底部加载样式并确保长列表不被侧栏flex压缩。接口、依赖和部署配置没有变动。页码分页存在并发增删造成重复/遗漏的限制：去重只能消除重复，不能补回遗漏；刷新可重新查询，后续高频变更场景再引入后端游标分页。

验证：在 `web` 执行 `node node_modules/typescript/bin/tsc`、`node node_modules/vite/bin/vite.js build` 通过。Playwright + Edge模拟接口验证滚动逐页加载、第二页失败后同页重试且保留20条、重复关系去重、末页停止、已加载过滤、刷新重置、空列表、390px无横向溢出和401退出通过。React开发StrictMode会启动并取消第一次初始化请求，这是开发检查行为；取消的旧响应不会追加。截图 `web/friends-infinite-mobile-check.png` 已检查。没有真实后端写入或Go变更，真实联调待用户验证。

## 2026-10-08 桌面界面（WEB-06）

以下为桌面改版记录，当时好友列表使用翻页；当前已由上方WEB-07的无限滚动替代。

参考用户提供的 QQ PC 截图，采用顶部账号栏、左侧图标导航、好友侧栏和右侧内容区。保留白云品牌和现有 React/API 封装，不引入新的界面库。参考项目 `easy-im-master/web-im/src/views/Home.vue`、`src/components/index.vue` 的全屏联系人/内容分区和空状态；参考实现使用 Vue + lemon-imui，本项目保持 React，并且聊天尚未接入，不能沿用其发送消息流程。

- `web/src/components/DesktopWorkspace.tsx` / `.css`：组织桌面布局和视图切换，统一检查登录有效期。消息入口展示待开发说明。
- `web/src/pages/AuthPage.tsx`：未登录显示原有登录注册表单；登录后进入桌面工作区，保留跨窗口会话同步和401退出。
- `web/src/components/FriendsList.tsx`：保持原分页请求，增加当前页昵称/用户ID过滤和可键盘操作的好友选择按钮；点击后在右侧显示资料。
- `web/src/components/UserProfile.tsx`：新增 `profileOnly` 参数，桌面个人资料页复用资料编辑、注销和Ping，避免重复展示社交功能。

操作：左侧联系人进入好友列表；搜索框仅过滤已加载的当前页，不增加服务器查询。加号打开添加好友；好友通知打开收到的申请及接受/拒绝操作，接受后刷新左侧好友列表。顶部头像或底部设置打开个人资料；退出图标清理当前会话。好友详情只展示昵称、ID和添加日期，不承诺在线状态；群聊和删除好友入口未增加。

桌面按三个栏位显示，左侧/右侧各自滚动；600px以下好友列表与内容上下排列，导航保留在左侧。适配390px屏幕无横向溢出。

验证（执行目录 `web`）：`node node_modules/typescript/bin/tsc`、`node node_modules/vite/bin/vite.js build` 通过。使用环境自带Playwright和本机Edge模拟HTTP接口，验证联系人选择/当前页过滤、接受后刷新好友、拒绝确认、添加好友请求正文、个人资料/消息切换、小屏和401退出，浏览器无脚本异常。截图 `web/desktop-workspace-check.png`、`web/desktop-mobile-check.png` 已检查，数据为模拟数据；未请求真实后端或修改Go代码，真实业务联调仍待用户验证。生产部署继续沿用 [Web部署说明](../deploy/web.md)，没有新增中间件或改变接口地址。

## 文件职责与调用流程

- web/src/components/FriendApplication.tsx：目标 ID 与附言表单、校验、加载态、阻止重复点击、结果提示和无障碍状态提示。
- web/src/api/social.ts、types/social.ts：好友申请 HTTP 封装与类型。
- web/src/api/auth.ts：共享客户端，附加 Bearer Token；错误正文只读取一次，支持 JSON、纯文本和空401；受保护请求401清理会话并通知页面。
- web/src/pages/AuthPage.tsx：订阅本窗口会话变化和其他标签页 storage 事件；登录后保留手机号，资料同步和退出同步。
- web/src/components/RegisterForm.tsx：按 UTF-8 字节判断 bcrypt 72字节上限，与后端空格/制表符/换行规则一致。
- web/src/components/UserProfile.tsx：用户中心加入好友表单，保留资料管理；修正账户删除说明，不承诺删除关联数据或销毁所有已签发令牌。
- web/vite.config.ts：/api/user 转发8888，/api/social 转发8889。
- web/src/pages/AuthPage.css：用户中心宽度、小屏布局、附言计数、焦点及减少动态效果适配。

调用：FriendApplication.submit → applyFriendApi → POST /api/social/friend/apply → API ApplyFriendLogic（从JWT获取userId）→ SocialRpc.ApplyFriend → UserRpc.GetUser + FriendRequestModel → 返回申请ID。

## 接口和交互

POST /api/social/friend/apply，正文例如 {"toUserId":17,"message":"你好"}，自动附带 Authorization: Bearer 登录令牌；成功响应 {"id":42}。不发送 fromUserId。

目标ID必须为正整数且不是本人；目前数字ID限制在 JavaScript 安全整数范围内。附言选填，trim后按 Unicode码点计数，最多255个；不是按字节或UTF-16长度计数。超长和自申请在前端阻止，后端继续校验。请求期间禁用表单；409重复申请、404用户不存在等服务错误显示给用户，申请失败不清空输入；成功显示编号并清空表单。

现有用户接口仍为 POST /api/user/register、login、ping，PUT/DELETE /api/user/:id。修改只发送非空且已变化字段。登录会话存localStorage，不记录或显示令牌内容；密码不保存。用户搜索接口尚未提供，所以当前用ID申请。

## 运行

Windows PowerShell，在项目根目录：

```powershell
cd web
npm install
npm run dev
```

本轮复用已有 node_modules，未重新安装依赖或修改依赖版本。页面地址 http://localhost:3000。先启动用户RPC8080（含新GetUser）、好友RPC8081、用户API8888、好友API8889，并确保 MySQL friend_request 表及唯一索引已创建、etcd发现地址可达。

构建：npm run build。代理环境 npm 命令不在PATH，本轮直接使用 node node_modules/typescript/bin/tsc 和 node node_modules/vite/bin/vite.js build 执行同等构建步骤。

## 验证记录

- TypeScript检查和Vite生产构建：通过。
- 使用环境自带Playwright及本机Edge、模拟HTTP响应测试：登录手机号同步、禁止自申请、JWT请求头和申请参数、申请成功、纯文本409显示、空正文401清理会话并回登录页、中文密码72字节限制均通过。
- 390px视口无横向溢出，手机全页截图已检查，截图 web/friend-mobile-check.png。
- 浏览器模拟不是实际数据库、etcd或RPC测试；没有向真实服务创建账户、修改资料、删除账户或发送申请。

真实联调：登录后用另一个已有用户ID发送申请，核对数据库和返回ID；再次申请检查重复提示；测试目标不存在及失效令牌。当前没有申请处理接口，重新申请可先独立验证RPC。

## 部署和限制

Vite代理仅适用于开发服务，dist 部署到Nginx时需分别代理 /api/user/ 和 /api/social/，见 [Web部署](../deploy/web.md)。无需向浏览器开放RPC端口。

JWT默认401可能为空正文，前端已提供登录提示；当前localStorage会话是客户端状态，不能替代服务端权限校验。删除用户不会自动清理申请记录或撤销全部旧JWT。好友关系/反向申请检查、好友搜索与实时通知仍是后续任务。


## 2026-10-06 收到的好友申请前端

用户授权完善该功能前端。依据 apps/social/api/social.api 和实际 API ListFriendApplicationsLogic，HTTP GET /api/social/friend/applications?page=1&pageSize=20，响应 applications:[{id,fromUserId,message,status}],total。当前HTTP不返回时间或昵称，不自行伪造这些字段。

修改 web/src/types/social.ts、api/social.ts、components/UserProfile.tsx、pages/AuthPage.css，新增 components/ReceivedFriendApplications.tsx。登录后自动查询本人收到的申请，展示申请编号、申请人ID、附言和状态（待处理/已接受/已拒绝），支持刷新、上一页/下一页、每页10/20/50条和总数。空列表和失败重试有明确反馈；页数缩减时回到有效页，切换每页数量回第1页，旧查询通过AbortController取消，避免旧数据覆盖。列表GET只传page/pageSize，自动附带JWT，不发送userId。前端没有接受或拒绝操作，不应将状态显示误认为已实现处理接口。

实际验证：node node_modules/typescript/bin/tsc 成功；node node_modules/vite/bin/vite.js build 成功。复用已有依赖，未安装或修改包版本。环境自带Playwright及本机Edge模拟API测试通过：列表和JWT请求头/无userId、三个状态、空附言、分页/页容量、刷新后页码回退、纯文本503/重试、空列表、空401退出、390px无横向溢出；手机截图 web/received-applications-mobile-check.png 已检查。模拟请求未访问实际API/数据库；真实接收用户隔离与分页联调待用户验证。

本机已有3000开发服务，尝试另启动因端口占用退出，未停止用户进程；浏览器通过既有服务验证。真实联调时用接收用户登录，检查该列表只展示发给自己的记录，确认数据库total及分页。现有Vite双API代理无需改动，生产Nginx配置仍见部署文档。


## 2026-10-08 前端处理申请与好友列表（WEB-05）

用户授权完善前端，修改仅限web及文档。依据当前social.api，新增 api/social.ts 的 handleFriendApplicationApi（POST /api/social/friend/applications/:id，正文仅status）、listFriendsApi（GET /api/social/friends?page=&pageSize=）；types/social.ts加入处理响应与好友列表类型。

ReceivedFriendApplications.tsx对待处理申请提供接受、拒绝按钮，拒绝需行内确认并可取消；使用ref阻止重复提交，操作期间禁用其他处理/分页/刷新。成功依据服务响应更新状态并刷新申请；接受后通知父组件刷新好友，失败保留状态并显示错误，退出后不更新已卸载界面。已处理记录不展示操作按钮。

新增 FriendsList.tsx，UserProfile.tsx挂载“我的好友”：显示昵称、好友用户ID、添加时间（Unix秒转换本地日期）；0或无效时间显示暂未提供，避免显示1970日期。支持刷新、分页、每页10/20/50、空列表与错误重试；旧查询取消，数据减少回有效页。无聊天/删除好友按钮，后端对应接口尚未提供。

验证命令：node node_modules/typescript/bin/tsc、node node_modules/vite/bin/vite.js build，均通过。环境自带Playwright+本机Edge模拟API测试通过：接受后好友刷新、拒绝确认/取消、操作互斥、POST路径/正文/JWT、失败不假改状态、好友列表分页/页容量、时间缺省、错误重试/空列表、390px无横向溢出、401清会话。截图web/friends-mobile-check.png已检查。没有真实API/数据库写入、没有修改Go业务或生成构建Go代码。

开发服务已由代理启动于http://127.0.0.1:3000。真实联调待用户启动当前版本user RPC、social RPC与两API，使用接收人账号接受申请后核对friend双行、列表昵称/时间，拒绝核对status2、不新增关系，测试第三人和重复处理。前端通过模拟测试不代表后端事务和权限运行已验证。
