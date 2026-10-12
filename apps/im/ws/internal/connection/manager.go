package connection

import (
	"sync"

	"github.com/gorilla/websocket"
)

type Manager struct {
	mu sync.RWMutex

	// 用户ID → 该用户的所有连接，支持同时打开多个页面。
	connections map[int64]map[*websocket.Conn]struct{}
}

func NewManager() *Manager {
	return &Manager{
		connections: make(map[int64]map[*websocket.Conn]struct{}),
	}
}
