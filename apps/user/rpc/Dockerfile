# syntax=docker/dockerfile:1
FROM golang:1.26.8
WORKDIR /app
ENV GOPROXY=https://goproxy.cn,direct

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download

COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -o /app/user-rpc ./apps/user/rpc

ENV TZ=Asia/Shanghai
EXPOSE 8080
ENTRYPOINT ["/app/user-rpc", "-f", "/app/etc/user.yaml"]