package search

import (
	"database/sql"
	"strings"
	"time"

	"georgedroyd.wtf/droydmail/modules/encryption"
)

type Email struct {
	Token          string    `json:"token"`
	Folder         string    `json:"folder"`
	From           string    `json:"from"`
	To             string    `json:"to"`
	Subject        string    `json:"subject"`
	Preview        string    `json:"preview"`
	Unread         bool      `json:"unread"`
	IsSystem       bool      `json:"isSystem"`
	HasAttachments bool      `json:"hasAttachments"`
	Time           time.Time `json:"time"`
}

type Service struct {
	db        *sql.DB
	masterKey string
}

func NewService(db *sql.DB, masterKey string) *Service {
	return &Service{db: db, masterKey: masterKey}
}

func (s *Service) StreamSearch(userID, query, folder string, onResult func(interface{}), onDone func(int)) error {
	var encryptedKey string
	if err := s.db.QueryRow(`SELECT encryption_key FROM users WHERE id = ?`, userID).Scan(&encryptedKey); err != nil {
		return err
	}
	encKey, err := encryption.DecryptUserKey(encryptedKey, s.masterKey)
	if err != nil {
		return err
	}

	queryLower := strings.ToLower(query)
	baseQuery := `SELECT e.token, e.folder, e.from_addr, e.to_addr, e.subject, e.preview, e.unread, e.is_system, e.created_at,
		(SELECT COUNT(*) FROM attachments WHERE email_id = e.id) as attach_count
		FROM emails e WHERE e.user_id = ?`
	args := []any{userID}
	if folder != "" && folder != "all" {
		baseQuery += ` AND e.folder = ?`
		args = append(args, folder)
	}
	baseQuery += ` ORDER BY e.created_at DESC`

	rows, err := s.db.Query(baseQuery, args...)
	if err != nil {
		return err
	}
	defer rows.Close()

	total := 0
	for rows.Next() {
		var e Email
		var unread, isSystem, attachCount int
		var encSubject, encPreview string
		if err := rows.Scan(&e.Token, &e.Folder, &e.From, &e.To, &encSubject, &encPreview, &unread, &isSystem, &e.Time, &attachCount); err != nil {
			continue
		}
		e.Subject, _ = encryption.Decrypt(encSubject, encKey)
		e.Preview, _ = encryption.Decrypt(encPreview, encKey)
		e.Unread = unread == 1
		e.IsSystem = isSystem == 1
		e.HasAttachments = attachCount > 0

		if strings.Contains(strings.ToLower(e.From), queryLower) ||
			strings.Contains(strings.ToLower(e.To), queryLower) ||
			strings.Contains(strings.ToLower(e.Subject), queryLower) ||
			strings.Contains(strings.ToLower(e.Preview), queryLower) {
			onResult(e)
			total++
		}
	}
	onDone(total)
	return nil
}