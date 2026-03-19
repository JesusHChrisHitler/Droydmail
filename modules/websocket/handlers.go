package websocket

import (
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
	"georgedroyd.wtf/droydmail/modules/logger"
)

func (h *Hub) NewUpgrader(allowedOrigins []string, readBuf, writeBuf int) websocket.Upgrader {
	return websocket.Upgrader{
		ReadBufferSize:  readBuf,
		WriteBufferSize: writeBuf,
		CheckOrigin: func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			if origin == "" {
				return true
			}
			for _, allowed := range allowedOrigins {
				if origin == "https://"+allowed || origin == "http://"+allowed {
					return true
				}
			}
			return false
		},
	}
}

func (h *Hub) HandleConnect(upgrader websocket.Upgrader) echo.HandlerFunc {
	return func(c echo.Context) error {
		userID := c.Get("userID").(string)
		logger.Debug("ws upgrade attempt", "userID", userID, "origin", c.Request().Header.Get("Origin"))
		conn, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
		if err != nil {
			logger.Error("ws upgrade failed", "error", err, "origin", c.Request().Header.Get("Origin"), "userID", userID)
			return c.JSON(400, echo.Map{"error": "upgrade failed"})
		}
	role, _ := c.Get("role").(string)
	isAdmin := role == "admin"
	client := h.Register(userID, conn, isAdmin)
	if client == nil {
		conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "too many connections"))
		conn.Close()
		return nil
	}
		go client.WritePump()
		go client.ReadPump()
		if h.countsProvider != nil {
			counts := h.countsProvider.GetUnreadCounts(userID)
			if h.adminCountsProvider != nil {
				role, _ := c.Get("role").(string)
				if role == "admin" {
					counts["admin"] = h.adminCountsProvider.GetUnreadReportCount()
				}
			}
			h.Send(userID, Message{Type: "unread_counts", Payload: UnreadCountsPayload(counts)})
		}
		return nil
	}
}