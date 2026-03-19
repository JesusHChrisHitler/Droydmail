package drafts

import (
	"database/sql"
	"time"

	"georgedroyd.wtf/droydmail/modules/encryption"
	"georgedroyd.wtf/droydmail/modules/token"
)

type Draft struct {
	ID        int64
	Token     string
	UserID    string
	FromAddr  string
	ToAddr    string
	CcAddr    string
	Subject   string
	Body      string
	UpdatedAt time.Time
	CreatedAt time.Time
}

func Migrate(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS drafts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			token TEXT NOT NULL UNIQUE,
			user_id INTEGER NOT NULL,
			from_addr TEXT NOT NULL DEFAULT '',
			to_addr TEXT NOT NULL DEFAULT '',
			cc_addr TEXT NOT NULL DEFAULT '',
			subject TEXT NOT NULL DEFAULT '',
			body TEXT NOT NULL DEFAULT '',
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id)
		);
		CREATE INDEX IF NOT EXISTS idx_drafts_user ON drafts(user_id);
		CREATE INDEX IF NOT EXISTS idx_drafts_token ON drafts(token);
	`)
	return err
}

func (s *Service) listDrafts(userID, encKey string) ([]Draft, error) {
	rows, err := s.db.Query(`
		SELECT id, token, user_id, from_addr, to_addr, cc_addr, subject, body, updated_at, created_at
		FROM drafts WHERE user_id = ?
		ORDER BY updated_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var drafts []Draft
	for rows.Next() {
		var d Draft
		if err := rows.Scan(&d.ID, &d.Token, &d.UserID, &d.FromAddr, &d.ToAddr, &d.CcAddr, &d.Subject, &d.Body, &d.UpdatedAt, &d.CreatedAt); err != nil {
			return nil, err
		}
		d.FromAddr, _ = encryption.Decrypt(d.FromAddr, encKey)
		d.ToAddr, _ = encryption.Decrypt(d.ToAddr, encKey)
		d.CcAddr, _ = encryption.Decrypt(d.CcAddr, encKey)
		d.Subject, _ = encryption.Decrypt(d.Subject, encKey)
		d.Body, _ = encryption.Decrypt(d.Body, encKey)
		drafts = append(drafts, d)
	}
	return drafts, nil
}

func (s *Service) getDraft(userID, draftToken, encKey string) (*Draft, error) {
	var d Draft
	err := s.db.QueryRow(`
		SELECT id, token, user_id, from_addr, to_addr, cc_addr, subject, body, updated_at, created_at
		FROM drafts WHERE token = ? AND user_id = ?
	`, draftToken, userID).Scan(&d.ID, &d.Token, &d.UserID, &d.FromAddr, &d.ToAddr, &d.CcAddr, &d.Subject, &d.Body, &d.UpdatedAt, &d.CreatedAt)
	if err != nil {
		return nil, err
	}
	d.FromAddr, _ = encryption.Decrypt(d.FromAddr, encKey)
	d.ToAddr, _ = encryption.Decrypt(d.ToAddr, encKey)
	d.CcAddr, _ = encryption.Decrypt(d.CcAddr, encKey)
	d.Subject, _ = encryption.Decrypt(d.Subject, encKey)
	d.Body, _ = encryption.Decrypt(d.Body, encKey)
	return &d, nil
}

func (s *Service) saveDraft(userID, draftToken, from, to, cc, subject, body, encKey string) (*Draft, error) {
	encFrom, _ := encryption.Encrypt(from, encKey)
	encTo, _ := encryption.Encrypt(to, encKey)
	encCc, _ := encryption.Encrypt(cc, encKey)
	encSubject, _ := encryption.Encrypt(subject, encKey)
	encBody, _ := encryption.Encrypt(body, encKey)

	if draftToken != "" {
		_, err := s.db.Exec(`
			UPDATE drafts SET from_addr = ?, to_addr = ?, cc_addr = ?, subject = ?, body = ?, updated_at = CURRENT_TIMESTAMP
			WHERE token = ? AND user_id = ?
		`, encFrom, encTo, encCc, encSubject, encBody, draftToken, userID)
		if err != nil {
			return nil, err
		}
		return &Draft{Token: draftToken}, nil
	}

	newToken := token.Generate(24)
	_, err := s.db.Exec(`
		INSERT INTO drafts (token, user_id, from_addr, to_addr, cc_addr, subject, body)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, newToken, userID, encFrom, encTo, encCc, encSubject, encBody)
	if err != nil {
		return nil, err
	}
	return &Draft{Token: newToken}, nil
}

func (s *Service) deleteDraft(userID, draftToken string) error {
	_, err := s.db.Exec(`DELETE FROM drafts WHERE token = ? AND user_id = ?`, draftToken, userID)
	return err
}