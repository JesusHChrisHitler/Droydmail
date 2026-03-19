package websocket

import "encoding/json"

type EmailPayload struct {
	Token          string `json:"token"`
	From           string `json:"from"`
	To             string `json:"to"`
	Subject        string `json:"subject"`
	Preview        string `json:"preview"`
	Folder         string `json:"folder"`
	Unread         bool   `json:"unread"`
	IsSystem       bool   `json:"isSystem"`
	HasAttachments bool   `json:"hasAttachments"`
	Time           string `json:"time"`
}

type StoragePayload struct {
	Used    int64   `json:"used"`
	Limit   int64   `json:"limit"`
	Percent float64 `json:"percent"`
}

type MailMovePayload struct {
	Token      string        `json:"token"`
	FromFolder string        `json:"fromFolder"`
	ToFolder   string        `json:"toFolder"`
	Email      *EmailPayload `json:"email,omitempty"`
}

type UnreadCountsPayload map[string]int

func (h *Hub) NotifyEmail(userID, token, from, to, subject, preview, folder, timeStr string, unread, isSystem, hasAttachments bool) {
	h.Send(userID, Message{
		Type:    "email",
		Payload: EmailPayload{Token: token, From: from, To: to, Subject: subject, Preview: preview, Folder: folder, Time: timeStr, Unread: unread, IsSystem: isSystem, HasAttachments: hasAttachments},
	})
}

func (h *Hub) NotifyStorage(userID string, used, limit int64, percent float64) {
	h.Send(userID, Message{
		Type:    "storage",
		Payload: StoragePayload{Used: used, Limit: limit, Percent: percent},
	})
}

func (h *Hub) NotifyContacts(userID string) {
	h.Send(userID, Message{Type: "contacts"})
}

func (h *Hub) NotifyMailMove(userID, token, fromFolder, toFolder, emailToken, from, to, subject, preview, timeStr string, unread, isSystem, hasAttachments bool) {
	var ep *EmailPayload
	if emailToken != "" {
		ep = &EmailPayload{Token: emailToken, From: from, To: to, Subject: subject, Preview: preview, Folder: toFolder, Time: timeStr, Unread: unread, IsSystem: isSystem, HasAttachments: hasAttachments}
	}
	h.Send(userID, Message{
		Type:    "mail_move",
		Payload: MailMovePayload{Token: token, FromFolder: fromFolder, ToFolder: toFolder, Email: ep},
	})
}

func (h *Hub) NotifyMailDelete(userID, token string) {
	h.Send(userID, Message{
		Type:    "mail_delete",
		Payload: map[string]string{"token": token},
	})
}

func (h *Hub) NotifyBatchDelete(userID string, tokens []string) {
	h.Send(userID, Message{
		Type:    "batch_delete",
		Payload: map[string][]string{"tokens": tokens},
	})
}

func (h *Hub) NotifyUnreadCounts(userID string, counts map[string]int) {
	h.Send(userID, Message{
		Type:    "unread_counts",
		Payload: UnreadCountsPayload(counts),
	})
}

type AliasPayload struct {
	ID        string `json:"id"`
	Alias     string `json:"alias"`
	Email     string `json:"email"`
	CreatedAt string `json:"created_at,omitempty"`
}

func (h *Hub) NotifyAliasCreate(userID, id, alias, email, createdAt string) {
	h.Send(userID, Message{
		Type:    "alias_create",
		Payload: AliasPayload{ID: id, Alias: alias, Email: email, CreatedAt: createdAt},
	})
}

func (h *Hub) NotifyAliasDelete(userID, id, email string) {
	h.Send(userID, Message{
		Type:    "alias_delete",
		Payload: AliasPayload{ID: id, Email: email},
	})
}

func (h *Hub) NotifyRoleChange(userID, role string) {
	h.Send(userID, Message{
		Type:    "role_change",
		Payload: map[string]string{"role": role},
	})
	h.SendToAdmins(Message{
		Type:    "user_role_change",
		Payload: map[string]string{"user_id": userID, "role": role},
	})
}

type ReportPayload struct {
	Token   string `json:"token"`
	From    string `json:"from"`
	Subject string `json:"subject"`
	Preview string `json:"preview"`
}

func (h *Hub) NotifyAdminCounts(count int) {
	h.SendToAdmins(Message{
		Type:    "admin_counts",
		Payload: map[string]int{"admin": count},
	})
}

func (h *Hub) NotifyAdminReport(token, from, subject, preview string) {
	h.SendToAdmins(Message{
		Type:    "admin_report",
		Payload: ReportPayload{Token: token, From: from, Subject: subject, Preview: preview},
	})
	if h.adminCountsProvider != nil {
		h.SendToAdmins(Message{
			Type:    "admin_counts",
			Payload: map[string]int{"admin": h.adminCountsProvider.GetUnreadReportCount()},
		})
	}
}

func (h *Hub) SendToAdmins(msg Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	for client := range h.adminClients {
		select {
		case client.send <- data:
		default:
		}
	}
}