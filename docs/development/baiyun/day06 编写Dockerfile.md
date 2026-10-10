#### 1.rpc
```dockerfile
FROM golang:1.26.8
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/user-rpc ./apps/user/rpc
ENV TZ=Asia/Shanghai
EXPOSE 8080
ENTRYPOINT ["/app/user-rpc", "-f", "/app/etc/user.yaml"]
```

| 行                                                                        | 作用                                             |
| ------------------------------------------------------------------------ | ---------------------------------------------- |
| `FROM golang:1.26.8`                                                     | 使用包含 Go 1.26.8 编译工具的镜像，作为容器环境。                 |
| `WORKDIR /app`                                                           | 设置工作目录为 `/app`，不存在时自动创建。                       |
| `COPY . .`                                                               | 将项目文件复制到 `/app`，排除 `.dockerignore` 指定的文件。      |
| `RUN CGO_ENABLED=0 GOOS=linux go build -o /app/user-rpc ./apps/user/rpc` | 构建镜像时编译 RPC 源码，生成 Linux 可执行程序 `/app/user-rpc`。 |
| `ENV TZ=Asia/Shanghai`                                                   | 设置上海时区；镜像中需要有对应时区数据。                           |
| `EXPOSE 8080`                                                            | 声明服务使用 8080 端口，实际映射由 Compose 配置。               |
| `ENTRYPOINT ["/app/user-rpc", "-f", "/app/etc/user.yaml"]`               | 容器启动时运行 RPC，读取 Compose 挂载的                     |