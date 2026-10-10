#### 1.作用：初始化 Go 模块，创建 go.mod 文件。
命令：
```cmd
go mod init baiyun
```

`go mod tidy` 会检查项目代码实际用到的依赖，补齐 `go.mod` 和 `go.sum` 中缺少的记录，并移除不再需要的依赖记录。
```
go mod tidy
```
#### 2.proto
```proto
// 使用 proto3 语法。  
syntax = "proto3";  
  
// 定义协议命名空间，避免不同服务的名称冲突。  
//baiyun：项目名称、user：用户模块、v1：第一个版本的接口协议。  
package baiyun.user;  
  
// 指定生成的 Go 包的导入路径，包名为 pb。  
//生成的user.pb.go、user_grpc.pb.go属于下面路径的包，其他 Go 文件应该用什么路径导入它  
// 指定生成文件位于本 RPC 服务目录下的 user 子目录，Go 包名为 user。  
option go_package = "./user";
  
// 定义请求消息 PingRequest。  
message PingRequest {  
  // 字符串字段 name；1 是字段编号，不是默认值。  
  string name = 1;  
} // 请求消息定义结束。  
  
// 定义响应消息 PingResponse。  
message PingResponse {  
  // 字符串字段 message；编号在当前消息内唯一。  
  string message = 1;  
} // 响应消息定义结束。  
  
// 定义名为 User 的 RPC 服务。  
service User {  
  // 定义 Ping 方法：接收 PingRequest，返回 PingResponse。  
  rpc Ping(PingRequest) returns (PingResponse);  
} // 服务定义结束。
```
##### 新增查询用户：
```
// 新方法的请求
message GetUserRequest {
  string id = 1;
}

// 新方法的响应
message GetUserResponse {
  string id = 1;
  string name = 2;
}

// 在原有服务中增加方法，无需再定义一个 User。
service User {
  rpc Ping(PingRequest) returns (PingResponse);
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
}
```


#### 3.将 `user.proto` 编译成 Go 的消息类型和 gRPC 接口代码。
```proto
goctl rpc protoc apps/user/rpc/user.proto --go_out=apps/user/rpc --go-grpc_out=apps/user/rpc --zrpc_out=apps/user/rpc --name-from-filename
```

| 分                             | 作用                                                      |
| ----------------------------- | ------------------------------------------------------- |
| `goctl rpc protoc`            | 根据 proto 生成 Protobuf、gRPC 和 go-zero 服务代码                |
| `apps/user/rpc/user.proto`    | 要处理的协议文件                                                |
| `--go_out=apps/user/rpc`      | 指定消息代码的输出根目录，生成 `user.pb.go`                            |
| `--go-grpc_out=apps/user/rpc` | 指定 gRPC 代码的输出根目录，生成 `user_grpc.pb.go`                   |
| `--zrpc_out=apps/user/rpc`    | 生成 go-zero 的 `etc`、`internal`、入口等服务骨架                   |
| `--name-from-filename`        | 按 `user.proto` 的文件名命名入口和配置，得到 `user.go`、`etc/user.yaml` |
按照**输入的 proto 文件名**命名，也就是：

```
apps/user/rpc/user.proto
              └─ user
```

`--name-from-filename` 取去掉 `.proto` 后的 `user`，所以生成 `user.go` 和 `etc/user.yaml`。它不取 `package baiyun.user` 或 `go_package = "./user"` 的值。
#### 4.编译后的文件解释
[user.pb.go (line 30)](E:/code/baiyun/apps/user/rpc/user/user.pb.go:30)，业务上主要用到：

```
PingRequest{Name: "小明"}        // 构造请求
req.GetName()                  // 读取请求中的名字

PingResponse{Message: "你好"}   // 构造响应
resp.GetMessage()              // 读取响应内容
```

再看 [user_grpc.pb.go (line 35)](E:/code/baiyun/apps/user/rpc/user/user_grpc.pb.go:35)，先认识这几个名字：

|名称|作用|
|---|---|
|`NewUserClient`|创建调用用户服务的客户端|
|`userClient.Ping`|将请求发送给远程服务端|
|`UserServer`|规定服务端必须提供哪些方法|
|`UnimplementedUserServer`|方法未实现时，默认返回“未实现”错误|
|`RegisterUserServer`|把你编写的服务实现注册到 gRPC|
它们都写着 `Ping`，但站在调用的两端：

- **`UserClient` 给调用方用**：调用 `client.Ping(...)` 时，生成代码通过网络发送请求。`opts` 是这次调用的选项。
- **`UserServer` 给提供服务的一方实现**：你编写 `Ping(...)` 的处理逻辑，再用 `RegisterUserServer` 注册它。

```
社交服务 → UserClient.Ping → 网络 → UserServer.Ping → 用户服务的业务逻辑
```

所以方法的请求和响应类型相同，是因为双方遵守同一份 `.proto` 约定；一个负责**发起调用**，一个负责**处理调用**。
实际调用关系是：

```
客户端调用 Ping
    ↓
生成代码发送请求
    ↓
服务端生成代码接收、解析请求
    ↓
你手写的 Ping 业务逻辑
    ↓
返回 PingResponse
```

#### 5.目录结构解释
这些文件都在 `apps/user/rpc/` 下，可以按“配置 → 接收请求 → 处理业务 → 返回结果”理解：

|路径|作用|
|---|---|
|`user.proto`|手写的协议：定义请求、响应和 RPC 方法|
|`user/`|根据 proto 生成的 Go 代码|
|`user/user.pb.go`|`PingRequest`、`PingResponse` 等消息类型|
|`user/user_grpc.pb.go`|gRPC 客户端、服务端接口和注册代码|
|`etc/user.yaml`|服务名称、监听地址等运行配置；当前还包含 etcd 配置|
|`internal/config/`|将配置文件内容映射为 Go 结构体|
|`internal/svc/`|创建并保存业务逻辑要用的依赖|
|`internal/server/`|接收 gRPC 调用，转交给 `logic`|
|`internal/logic/`|**编写 Ping 等业务逻辑的主要位置**|
|`userclient/`|供其他 go-zero 服务调用用户 RPC 的封装|
|根目录 `user.go`|服务启动入口：读取配置、创建服务并注册 RPC 方法|

一次请求的大致路径是：
```
其他服务 → userclient → user_grpc.pb.go → internal/server → internal/logic
```

