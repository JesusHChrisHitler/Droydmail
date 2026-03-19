package websocket

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type Message struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload,omitempty"`
}

type Client struct {
	hub     *Hub
	conn    *websocket.Conn
	userID  string
	isAdmin bool
	send    chan []byte
}

type Config struct {
	WriteWait       time.Duration
	PongWait        time.Duration
	PingPeriod      time.Duration
	MaxMessageSize  int64
	MaxConnsPerUser int
}

type Searcher interface {
	StreamSearch(userID, query, folder string, onResult func(interface{}), onDone func(int)) error
}

type CountsProvider interface {
	GetUnreadCounts(userID string) map[string]int
}

type AdminCountsProvider interface {
	GetUnreadReportCount() int
}

type Hub struct {
	mu                  sync.RWMutex
	clients             map[string]map[*Client]struct{}
	adminClients        map[*Client]struct{}
	config              *Config
	searcher            Searcher
	countsProvider      CountsProvider
	adminCountsProvider AdminCountsProvider
}

func NewHub(cfg *Config) *Hub {
	return &Hub{
		clients:      make(map[string]map[*Client]struct{}),
		adminClients: make(map[*Client]struct{}),
		config:       cfg,
	}
}

func (h *Hub) SetSearcher(s Searcher) {
	h.searcher = s
}

func (h *Hub) SetCountsProvider(p CountsProvider) {
	h.countsProvider = p
}

func (h *Hub) SetAdminCountsProvider(p AdminCountsProvider) {
	h.adminCountsProvider = p
}

func (h *Hub) Register(userID string, conn *websocket.Conn, isAdmin bool) *Client {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.clients[userID] == nil {
		h.clients[userID] = make(map[*Client]struct{})
	}
	if len(h.clients[userID]) >= h.config.MaxConnsPerUser {
		return nil
	}
	client := &Client{
		hub:     h,
		conn:    conn,
		userID:  userID,
		isAdmin: isAdmin,
		send:    make(chan []byte, 256),
	}
	h.clients[userID][client] = struct{}{}
	if isAdmin {
		h.adminClients[client] = struct{}{}
	}
	return client
}

func (h *Hub) Unregister(client *Client) {
	h.mu.Lock()
	if clients, ok := h.clients[client.userID]; ok {
		if _, exists := clients[client]; exists {
			delete(clients, client)
			close(client.send)
			if len(clients) == 0 {
				delete(h.clients, client.userID)
			}
		}
	}
	if client.isAdmin {
		delete(h.adminClients, client)
	}
	h.mu.Unlock()
}

func (h *Hub) Send(userID string, msg Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	h.mu.RLock()
	clients := h.clients[userID]
	h.mu.RUnlock()
	for client := range clients {
		select {
		case client.send <- data:
		default:
			go h.Unregister(client)
		}
	}
}

func (h *Hub) Broadcast(msg Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, clients := range h.clients {
		for client := range clients {
			select {
			case client.send <- data:
			default:
			}
		}
	}
}

type SearchRequest struct {
	ID     string `json:"id"`
	Query  string `json:"query"`
	Folder string `json:"folder"`
}

func (c *Client) ReadPump() {
	defer func() {
		c.hub.Unregister(c)
		c.conn.Close()
	}()
	c.conn.SetReadLimit(c.hub.config.MaxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(c.hub.config.PongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(c.hub.config.PongWait))
		return nil
	})
	for {
		_, data, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
		var msg struct {
			Type    string          `json:"type"`
			Payload json.RawMessage `json:"payload"`
		}
		if json.Unmarshal(data, &msg) != nil {
			continue
		}
		if msg.Type == "search" && c.hub.searcher != nil {
			var req SearchRequest
			if json.Unmarshal(msg.Payload, &req) != nil {
				continue
			}
			go func(searchID, query, folder string) {
				c.hub.searcher.StreamSearch(c.userID, query, folder,
					func(email interface{}) {
						c.sendJSON(Message{Type: "search_result", Payload: map[string]interface{}{"id": searchID, "email": email}})
					},
					func(total int) {
						c.sendJSON(Message{Type: "search_done", Payload: map[string]interface{}{"id": searchID, "total": total}})
					},
				)
			}(req.ID, req.Query, req.Folder)
		}
	}
}

func (c *Client) sendJSON(msg Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	select {
	case c.send <- data:
	default:
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(c.hub.config.PingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(c.hub.config.WriteWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(c.hub.config.WriteWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}