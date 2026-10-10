# 第 1 课：从 proto 到第一次 gRPC 调用

> 历史学习资料：用户已决定正式服务始终按 go-zero 常规流程开发。本页的 `examples/grpc-ping`、原生 gRPC 服务端和客户端步骤不再作为 baiyun 项目待执行任务。当前正式入口是 `apps/user/rpc/user.proto`，下一步使用 `goctl rpc protoc` 生成服务骨架；进度以 [会话交接](../tasks/HANDOFF.md) 为准。

编写日期：2026-09-29。适用环境：Windows PowerShell。

本课目标：自己写出一个协议文件，生成 Go 代码，实现客户端和服务端，让客户端发送 `baiyun`，服务端返回 `hello, baiyun`。

**当前状态：这是一份待操作的教程。示例文件尚未创建，未完成编译和运行验证。** 本轮用 `Get-Command` 检查 Go、protoc 和两个生成插件，当前 PowerShell 均未找到命令；这只表示命令不可用，不能据此断定机器没有安装。学习时先完成环境检查。

建议分三次练习：先读第 1～4 节并写 proto，再做第 5～8 节生成和调用，最后做错误实验与参考项目对照。需要先能阅读 Go 的结构体、方法、指针和 `error` 返回值；不熟悉时可结合本课代码逐项理解。

## 1. 先分清四个东西

| 名称 | 本课中的职责 |
| --- | --- |
| `.proto` 文件 | 写清楚请求、响应、服务和方法，是双方共享的接口约定 |
| Protocol Buffers（Protobuf） | 描述数据结构，并将消息编码成可传输的数据，再解码回来 |
| gRPC | 让客户端通过网络调用服务端实现的方法 |
| go-zero | 后续用来组织服务、配置与业务逻辑的框架；本课先直接使用 gRPC |

调用远程方法看起来像 `client.Ping(...)`，实际会经过网络，因此可能连接失败、超时或收到服务端错误。远程调用不能当作一定成功的普通函数调用。参见 [gRPC Go 基础教程](https://grpc.io/docs/languages/go/basics/)。

本课只练习一次请求对应一次响应的普通 RPC，不涉及流式消息、数据库和服务发现。

```text
手写 user.proto
      │ protoc + 两个 Go 插件
      ├── user.pb.go：消息类型及序列化相关代码
      └── user_grpc.pb.go：客户端接口、服务端接口和注册代码

客户端 main → 生成的 Ping 客户端方法 → 网络
                                         ↓
客户端读取响应 ← 网络 ← 手写的服务端 Ping 方法
```

## 2. 准备工具

### 2.1 检查现状

在 PowerShell 执行；命令缺失时先处理缺失项，再执行后面的命令。

```powershell
Get-Command go, protoc, protoc-gen-go, protoc-gen-go-grpc -ErrorAction SilentlyContinue
go version
protoc --version
protoc-gen-go --version
protoc-gen-go-grpc --version
```

| 工具 | 做什么 |
| --- | --- |
| Go | 编译并运行 `.go` 文件，也负责下载 Go 依赖 |
| protoc | 读取 `.proto`，调用对应语言插件 |
| protoc-gen-go | 生成消息类型，如 `PingRequest` |
| protoc-gen-go-grpc | 生成 gRPC 客户端和服务端接口 |

Go 可以从 [Go 官方安装说明](https://go.dev/doc/install) 安装。Windows 的 protoc 可从 [Protobuf 官方发布页](https://github.com/protocolbuffers/protobuf/releases) 选择适合本机架构的 Windows 压缩包，解压并保留 `bin` 与 `include`，把实际 `bin` 路径加入用户 PATH，再打开终端验证。参见 [protoc 安装说明](https://grpc.io/docs/protoc-installation/)。

### 2.2 本课使用固定的学习版本

为了贴近参考项目，本课依赖使用 gRPC-Go `v1.68.0`、Protobuf Go `v1.35.2`；这是学习示例的固定版本，不表示当前生产版本推荐。示例按 Go 1.23 或更高版本编写。protoc 使用支持 proto3 的版本，实际版本需要记录。

安装插件的命令如下。先确认 Go 能运行，安装成功后再继续：

```powershell
go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.35.2
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.5.1
```

插件是生成代码时运行的程序；项目依赖则是运行和编译服务时使用的库。安装插件不会代替后面的 `go get`。这两个插件的分工见 [官方快速入门](https://grpc.io/docs/languages/go/quickstart/)。

如果安装成功却仍然找不到插件，在当前 PowerShell 中添加 Go 的工具目录：

```powershell
$grpcToolsBin = go env GOBIN
if ([string]::IsNullOrWhiteSpace($grpcToolsBin)) {
    $grpcToolsBin = Join-Path ((go env GOPATH) -split ';')[0] 'bin'
}
$env:Path = "$grpcToolsBin;$env:Path"
protoc-gen-go --version
protoc-gen-go-grpc --version
```

该 PATH 修改只对当前终端生效。后续可把打印出的实际工具目录加入 Windows 用户 PATH；不需要用管理员终端覆盖系统 PATH。

## 3. 建立最小练习目录

本课使用仓库根目录作为 Go 模块根，模块名暂定为 `example.com/baiyun`。它是本地教学用的导入路径，不需要申请该域名；以后使用真实仓库地址时，应同步修改模块名、proto 的 `go_package` 和 Go 导入路径。

先检查 `go.mod` 是否已存在。只在不存在时初始化，已有模块就使用它，并同步替换教程中的导入路径。

```powershell
Set-Location E:\code\baiyun
Test-Path .\go.mod
# 仅当上一条返回 False 时执行下一条
go mod init example.com/baiyun
New-Item -ItemType Directory -Force -Path .\examples\grpc-ping\pb, .\examples\grpc-ping\server, .\examples\grpc-ping\client
```

完成本课后的预期结构如下，目前这些示例文件尚未创建：

```text
baiyun/
├── go.mod
├── go.sum
└── examples/grpc-ping/
    ├── pb/
    │   ├── user.proto          手写：协议约定
    │   ├── user.pb.go          生成：消息代码
    │   └── user_grpc.pb.go     生成：RPC 代码
    ├── server/main.go         手写：服务端
    └── client/main.go         手写：客户端
```

练习放在 `examples`，便于先理解原生 gRPC。进入 go-zero 阶段再按项目约定在 `apps/user/rpc` 组织业务代码。

## 4. 写第一个 proto

创建 `examples/grpc-ping/pb/user.proto`，保存为 UTF-8：

```proto
syntax = "proto3";

package baiyun.user.v1;

option go_package = "example.com/baiyun/examples/grpc-ping/pb";

message PingRequest {
  string name = 1;
}

message PingResponse {
  string message = 1;
}

service User {
  rpc Ping(PingRequest) returns (PingResponse);
}
```

### 4.1 逐项理解

- `syntax = "proto3"`：选择 proto3 语法，与参考项目保持一致。
- `package baiyun.user.v1`：协议的命名空间，区分其他服务的同名消息。
- `go_package`：生成代码对应的 Go 导入路径。本例目录末尾为 `pb`，生成的 Go 包名也是 `pb`。它和 proto 的 `package` 是两个不同概念。参见 [Go 生成代码指南](https://protobuf.dev/reference/go/go-generated/)。
- `message`：定义一类消息，不是定义数据库表。
- `string name = 1`：类型是字符串，字段名是 `name`，字段编号是 `1`。
- `service User`：定义一个服务，包含一个或多个 RPC 方法。
- `rpc Ping(...) returns (...)`：规定输入与输出的消息类型；具体返回什么内容由手写 Go 代码实现。

本例的 `Ping` 是学习用的问候方法，不是 gRPC 标准健康检查协议。

### 4.2 字段编号最容易理解错

`= 1` 是字段在编码中的标识，不是默认值，也不是数组下标。同一个消息内编号不可重复；不同消息可以各自使用 `1`。已经发布的编号不要改作其他含义。

普通 proto3 `string` 未设置时读到空字符串；如果需要区分“没有传”和“显式传了空字符串”，可后续学习 `optional`。本例统一把空字符串视为无效输入。删除已发布字段后应保留其编号和名称，例如：

```proto
// 独立的演示片段，不要替换本课仍然使用 name 的 PingRequest。
message OldProfile {
  reserved 1;
  reserved "name";
  string nickname = 2;
}
```

这些约束与兼容性规则见 [proto3 语言指南](https://protobuf.dev/programming-guides/proto3/)。本课先掌握字符串、消息与方法，数组和嵌套结构留到用户查询练习。

## 5. 生成 Go 代码

回到仓库根目录执行这一条完整命令，PowerShell 不使用 Bash 的反斜杠换行：

```powershell
Set-Location E:\code\baiyun
protoc --proto_path=. --go_out=. --go_opt=paths=source_relative --go-grpc_out=. --go-grpc_opt=paths=source_relative examples/grpc-ping/pb/user.proto
```

`--proto_path=.` 指定查找 proto 的根目录；两组 `out` 分别开启消息代码和 RPC 代码生成；`paths=source_relative` 让生成文件沿用 proto 的相对目录。因此两个 `.go` 文件应出现在 `examples/grpc-ping/pb`。生成模式参见 [Go 生成代码指南](https://protobuf.dev/reference/go/go-generated/)。

打开生成文件，只需要找到：

| 文件 | 先关注的名字 | 用途 |
| --- | --- | --- |
| `user.pb.go` | `PingRequest`、`PingResponse`、`GetName` | 在 Go 中构造和读取消息 |
| `user_grpc.pb.go` | `NewUserClient` | 构造客户端调用入口 |
| `user_grpc.pb.go` | `UserServer` | 服务端需要实现的接口 |
| `user_grpc.pb.go` | `UnimplementedUserServer` | 为未实现方法提供默认行为，并支持服务接口扩展 |
| `user_grpc.pb.go` | `RegisterUserServer` | 将实现注册到 gRPC 服务端 |

生成文件不放手写业务逻辑。修改协议后重新生成，业务逻辑放在下面两个 `main.go` 中。

## 6. 实现服务端

创建 `examples/grpc-ping/server/main.go`：

```go
package main

import (
    "context"
    "flag"
    "log"
    "net"
    "strings"

    pb "example.com/baiyun/examples/grpc-ping/pb"
    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

type userServer struct {
    pb.UnimplementedUserServer
}

func (s *userServer) Ping(ctx context.Context, req *pb.PingRequest) (*pb.PingResponse, error) {
    name := strings.TrimSpace(req.GetName())
    if name == "" {
        return nil, status.Error(codes.InvalidArgument, "name must not be empty")
    }
    return &pb.PingResponse{Message: "hello, " + name}, nil
}

func main() {
    addr := flag.String("addr", "127.0.0.1:50051", "listen address")
    flag.Parse()

    listener, err := net.Listen("tcp", *addr)
    if err != nil {
        log.Fatal(err)
    }
    defer listener.Close()

    server := grpc.NewServer()
    pb.RegisterUserServer(server, &userServer{})
    log.Printf("gRPC server listening on %s", *addr)
    if err := server.Serve(listener); err != nil {
        log.Fatal(err)
    }
}
```

阅读顺序：

1. `net.Listen` 打开监听端口。地址使用启动参数，默认仅监听本机。
2. `grpc.NewServer` 创建负责接收与分发 RPC 的对象。
3. `RegisterUserServer` 告诉它 `User` 服务由哪个 Go 对象实现。
4. `Serve` 持续处理连接；它通常不会立即返回。
5. 请求到达后，gRPC 调用我们写的 `Ping`，执行校验并返回响应或错误。

`&pb.PingResponse{...}` 创建响应并返回它的指针。两个返回值分别代表响应和错误。`ctx` 携带本次调用的超时、取消等信息，本例逻辑立即返回，因此没有异步等待；以后访问数据库时要继续传递它。

匿名嵌入的 `pb.UnimplementedUserServer` 使用值类型；不要删除它，也不要把业务代码写进它的生成实现中。

## 7. 实现客户端

创建 `examples/grpc-ping/client/main.go`：

```go
package main

import (
    "context"
    "flag"
    "fmt"
    "log"
    "time"

    pb "example.com/baiyun/examples/grpc-ping/pb"
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
    "google.golang.org/grpc/status"
)

func main() {
    addr := flag.String("addr", "127.0.0.1:50051", "server address")
    name := flag.String("name", "baiyun", "name to greet")
    timeout := flag.Duration("timeout", 3*time.Second, "RPC timeout")
    flag.Parse()

    conn, err := grpc.NewClient(*addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    client := pb.NewUserClient(conn)
    ctx, cancel := context.WithTimeout(context.Background(), *timeout)
    defer cancel()

    response, err := client.Ping(ctx, &pb.PingRequest{Name: *name})
    if err != nil {
        log.Printf("Ping failed: code=%s, message=%s", status.Code(err), status.Convert(err).Message())
        return
    }
    fmt.Println(response.GetMessage())
}
```

`grpc.NewClient` 创建通信通道时不会立即完成网络连接；返回成功不代表服务端在线，要看 `Ping` 的结果。这个 API 从 gRPC-Go v1.63.0 起提供，本课固定的 v1.68.0 可使用。参见 [版本对应的 API 文档](https://pkg.go.dev/google.golang.org/grpc@v1.68.0#NewClient)。

`context.WithTimeout` 限制这一次调用等待的时间，`cancel` 在退出时释放相关资源。`insecure.NewCredentials()` 表示本地练习不使用 TLS；本例只连接本机，部署到真实网络时需要另行配置传输安全。

本例错误分支打印错误后直接返回，因此进程退出码仍可能是 0；练习时检查打印的 gRPC 错误码，不要单凭退出码判定成功。

## 8. 下载依赖并完成首次调用

写完上述文件并生成代码后，在仓库根目录执行：

```powershell
go get google.golang.org/grpc@v1.68.0 google.golang.org/protobuf@v1.35.2
go mod tidy
gofmt -w .\examples\grpc-ping\server\main.go .\examples\grpc-ping\client\main.go
go build ./examples/grpc-ping/...
```

只有构建成功后再启动服务。不要在生成文件缺失时靠 `go mod tidy` 修复本地 `pb` 导入；应先检查第 5 节的生成路径。

终端 A：

```powershell
Set-Location E:\code\baiyun
go run ./examples/grpc-ping/server
```

保持终端 A 运行，打开终端 B：

```powershell
Set-Location E:\code\baiyun
go run ./examples/grpc-ping/client -name baiyun
```

**预期输出，尚非实测：**

```text
hello, baiyun
```

改成 `-name xiaoming`，应返回 `hello, xiaoming`。练习结束在终端 A 按 `Ctrl+C` 停止服务。

## 9. 做三个错误实验

| 操作 | 预期观察 | 学习点 |
| --- | --- | --- |
| 服务端运行时，客户端使用 `-name "   "` | `InvalidArgument` | 请求传到了服务端，但参数校验未通过 |
| 停止服务端后再次调用 | 通常为 `Unavailable`；具体信息依运行环境而定 | 创建客户端不代表已连上服务端 |
| 服务端运行时，客户端使用 `-timeout=0s` | `DeadlineExceeded` | 截止时间已到，调用没有可用的等待时间 |

错误实验用于认识不同失败原因，不需要改生成文件。完整练习至少记录正常请求、无效参数、服务未启动三种结果。

## 10. 常见问题

| 现象 | 检查方式 |
| --- | --- |
| 找不到 `protoc` | 检查实际安装位置与 PATH，重新打开终端 |
| 找不到 `protoc-gen-go` 或 `protoc-gen-go-grpc` | 检查插件安装是否成功，核对 `go env GOBIN` / `GOPATH` 和 PATH |
| `unable to determine Go import path` | 检查 proto 是否包含正确的 `go_package` |
| 找不到本地 `pb` 包 | 核对 `go.mod` 模块名、`go_package`、Go import 和生成目录是否一致 |
| `undefined: grpc.NewClient` | 检查实际 gRPC 依赖版本：`go list -m google.golang.org/grpc` |
| 生成代码提示 gRPC / protobuf 版本不兼容 | 检查生成插件和运行库版本，回到本课固定版本重新生成并构建 |
| 下载失败 | 查看具体网络、证书或代理错误；先确认 `go env GOPROXY`，不要无依据修改全局配置 |
| 端口被占用 | 换用 `-addr 127.0.0.1:50052`，服务端和客户端都要传相同地址 |
| 用浏览器打开端口没有普通网页 | 本课提供原生 gRPC 服务，没有 HTTP 页面；使用示例客户端调用 |

## 11. 对照 go-zero-im，理解下一步

参考根目录：`E:\code\go-zero-im\easy-im-master\go-im`。

| 已阅读的参考文件（相对参考根目录） | 内容 | 与本课的关系 |
| --- | --- | --- |
| `apps/user/rpc/user.proto` | 定义 `User` 服务及 `Ping(Request) returns(Response)`，还有登录、注册等方法 | 本课只保留 Ping 思路，改为语义更明确的请求与响应名 |
| `apps/user/rpc/internal/server/userserver.go` | `UserServer.Ping` 创建 `PingLogic` 并调用其 `Ping` | 对应本课服务端入口，但业务逻辑进一步分离 |
| `apps/user/rpc/internal/logic/pinglogic.go` | 返回固定的 `Pong: "hello world!"` | 本课返回带名字的问候，并增加空值检查 |

参考 proto 使用 `option go_package = "./user"`；本课使用与 Go 模块一致的完整导入路径，便于理解原生生成工具的路径关系，不直接复制参考配置。

本课调用流程是 `client → gRPC → userServer.Ping`。进入 go-zero 后再理解 `client → gRPC → server.Ping → logic.Ping`，以及 `svc` 如何向逻辑层提供配置和依赖。这一步先不部署 etcd；显式地址就能用于基础调用练习。

## 12. 自测与记录

完成后尝试不用看教程回答：

1. proto 的 `package` 和 `go_package` 各自影响什么？
2. `string name = 1` 中的 `1` 能随便改吗？
3. 两个生成文件分别提供哪些能力？业务代码应该写在哪里？
4. 为什么 `NewClient` 成功后 `Ping` 仍可能失败？
5. 发送空白名字和服务端未启动，为什么是不同的错误码？
6. 修改 proto 后，为什么需要重新生成代码？

填写真实记录后再勾选任务：

| 项目 | 实际记录 |
| --- | --- |
| Go / protoc / 两个插件版本 | 待检查 |
| `go list -m google.golang.org/grpc google.golang.org/protobuf` | 待执行 |
| 代码生成与 `go build` | 待执行 |
| 正常请求输出 | 待执行 |
| 空白参数结果 | 待执行 |
| 服务停止后的调用结果 | 待执行 |
| 截止时间实验 | 待执行 |

下一课再将同一份协议迁入 go-zero，比较生成目录和调用链；本课完成不代表已经完成用户业务服务。
