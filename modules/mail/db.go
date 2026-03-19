package mail

import (
	"database/sql"
	"strings"
	"time"

	"georgedroyd.wtf/droydmail/modules/encryption"
	"georgedroyd.wtf/droydmail/modules/token"
)

type Email struct {
	ID        int64
	Token     string
	UserID    string
	Folder    string
	FromAddr  string
	ToAddr    string
	CcAddr    string
	Subject   string
	Body      string
	BodyHTML  string
	Preview   string
	Unread    bool
	IsSystem  bool
	IsTrash   bool
	CreatedAt time.Time
}

type Attachment struct {
	ID          int64
	Token       string
	EmailID     int64
	Filename    string
	ContentType string
	Size        int64
	FilePath    string
}

func Migrate(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS emails (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			token TEXT NOT NULL UNIQUE,
			user_id INTEGER NOT NULL,
			folder TEXT NOT NULL DEFAULT 'inbox',
			from_addr TEXT NOT NULL,
			to_addr TEXT NOT NULL,
			subject TEXT NOT NULL,
			body TEXT NOT NULL,
			body_html TEXT NOT NULL DEFAULT '',
			preview TEXT NOT NULL,
			unread INTEGER NOT NULL DEFAULT 1,
			is_system INTEGER NOT NULL DEFAULT 0,
			is_trash INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id)
		);
		CREATE INDEX IF NOT EXISTS idx_emails_user_folder ON emails(user_id, folder);
		CREATE INDEX IF NOT EXISTS idx_emails_token ON emails(token);
	`)
	if err != nil {
		return err
	}
	db.Exec(`ALTER TABLE emails ADD COLUMN is_system INTEGER NOT NULL DEFAULT 0`)

	db.Exec(`
		CREATE TABLE IF NOT EXISTS attachments (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			token TEXT NOT NULL UNIQUE,
			email_id INTEGER NOT NULL,
			filename TEXT NOT NULL,
			content_type TEXT NOT NULL,
			size INTEGER NOT NULL,
			file_path TEXT NOT NULL DEFAULT '',
			FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
		);
		CREATE INDEX IF NOT EXISTS idx_attachments_email ON attachments(email_id);
		CREATE INDEX IF NOT EXISTS idx_attachments_token ON attachments(token);
	`)
	db.Exec(`ALTER TABLE attachments ADD COLUMN file_path TEXT NOT NULL DEFAULT ''`)
	db.Exec(`ALTER TABLE emails ADD COLUMN is_trash INTEGER NOT NULL DEFAULT 0`)
	db.Exec(`ALTER TABLE emails ADD COLUMN previous_folder TEXT NOT NULL DEFAULT ''`)
	db.Exec(`ALTER TABLE emails ADD COLUMN cc_addr TEXT NOT NULL DEFAULT ''`)
	db.Exec(`
		CREATE TABLE IF NOT EXISTS report_emails (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			token TEXT NOT NULL UNIQUE,
			from_addr TEXT NOT NULL,
			to_addr TEXT NOT NULL,
			subject TEXT NOT NULL,
			body TEXT NOT NULL,
			body_html TEXT NOT NULL DEFAULT '',
			preview TEXT NOT NULL,
			unread INTEGER NOT NULL DEFAULT 1,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
		CREATE INDEX IF NOT EXISTS idx_report_emails_token ON report_emails(token);
	`)
	return nil
}

func (s *Service) listEmails(userID string, folder, encKey string, limit, offset int, filter string, recipient []string) ([]Email, error) {
	query := `SELECT id, token, user_id, folder, from_addr, to_addr, subject, body, body_html, preview, unread, is_system, created_at FROM emails WHERE user_id = ? AND folder = ?`
	args := []any{userID, folder}
	if filter == "unread" {
		query += ` AND unread = 1`
	} else if filter == "read" {
		query += ` AND unread = 0`
	} else if filter == "attachments" {
		query += ` AND id IN (SELECT email_id FROM attachments)`
	}
	if len(recipient) > 0 {
		placeholders := make([]string, len(recipient))
		for i, r := range recipient {
			placeholders[i] = "?"
			args = append(args, r)
		}
		addrColumn := "to_addr"
		if folder == "sent" {
			addrColumn = "from_addr"
		}
		query += ` AND ` + addrColumn + ` IN (` + strings.Join(placeholders, ",") + `)`
	}
	query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
	args = append(args, limit, offset)
	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var emails []Email
	for rows.Next() {
		var e Email
		var unread, isSystem int
		if err := rows.Scan(&e.ID, &e.Token, &e.UserID, &e.Folder, &e.FromAddr, &e.ToAddr, &e.Subject, &e.Body, &e.BodyHTML, &e.Preview, &unread, &isSystem, &e.CreatedAt); err != nil {
			return nil, err
		}
		e.Subject, _ = encryption.Decrypt(e.Subject, encKey)
		e.Body, _ = encryption.Decrypt(e.Body, encKey)
		e.BodyHTML, _ = encryption.Decrypt(e.BodyHTML, encKey)
		e.Preview, _ = encryption.Decrypt(e.Preview, encKey)
		e.FromAddr, _ = encryption.Decrypt(e.FromAddr, encKey)
		e.ToAddr, _ = encryption.Decrypt(e.ToAddr, encKey)
		e.Unread = unread == 1
		e.IsSystem = isSystem == 1
		emails = append(emails, e)
	}
	return emails, nil
}

func (s *Service) getEmailByToken(userID string, emailToken, encKey string) (*Email, error) {
	var e Email
	var unread, isSystem int
	err := s.db.QueryRow(`
		SELECT id, token, user_id, folder, from_addr, to_addr, cc_addr, subject, body, body_html, preview, unread, is_system, created_at
		FROM emails WHERE token = ? AND user_id = ?
	`, emailToken, userID).Scan(&e.ID, &e.Token, &e.UserID, &e.Folder, &e.FromAddr, &e.ToAddr, &e.CcAddr, &e.Subject, &e.Body, &e.BodyHTML, &e.Preview, &unread, &isSystem, &e.CreatedAt)
	if err != nil {
		return nil, err
	}
	e.Subject, _ = encryption.Decrypt(e.Subject, encKey)
	e.Body, _ = encryption.Decrypt(e.Body, encKey)
	e.BodyHTML, _ = encryption.Decrypt(e.BodyHTML, encKey)
	e.Preview, _ = encryption.Decrypt(e.Preview, encKey)
	e.CcAddr, _ = encryption.Decrypt(e.CcAddr, encKey)
	e.FromAddr, _ = encryption.Decrypt(e.FromAddr, encKey)
	e.ToAddr, _ = encryption.Decrypt(e.ToAddr, encKey)
	e.Unread = unread == 1
	e.IsSystem = isSystem == 1
	return &e, nil
}

func (s *Service) markReadByToken(userID, emailToken string) error {
	_, err := s.db.Exec(`UPDATE emails SET unread = 0 WHERE token = ? AND user_id = ?`, emailToken, userID)
	return err
}

func (s *Service) createEmail(userID string, folder, from, to, cc, subject, body, bodyHTML string, isSystem bool, encKey string) (*Email, error) {
	emailToken := token.Generate(24)
	preview := body
	if len(preview) > 100 {
		preview = preview[:100]
	}
	unread := 1
	if folder == "sent" {
		unread = 0
	}
	systemFlag := 0
	if isSystem {
		systemFlag = 1
	}

	encSubject, _ := encryption.Encrypt(subject, encKey)
	encBody, _ := encryption.Encrypt(body, encKey)
	encBodyHTML, _ := encryption.Encrypt(bodyHTML, encKey)
	encPreview, _ := encryption.Encrypt(preview, encKey)
	encCc, _ := encryption.Encrypt(cc, encKey)
	encFrom, _ := encryption.Encrypt(from, encKey)
	encTo, _ := encryption.Encrypt(to, encKey)

	res, err := s.db.Exec(`
		INSERT INTO emails (token, user_id, folder, from_addr, to_addr, cc_addr, subject, body, body_html, preview, unread, is_system)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, emailToken, userID, folder, encFrom, encTo, encCc, encSubject, encBody, encBodyHTML, encPreview, unread, systemFlag)
	if err != nil {
		return nil, err
	}

	id, _ := res.LastInsertId()
	return &Email{ID: id, Token: emailToken, UserID: userID, Folder: folder, FromAddr: from, ToAddr: to, Subject: subject, Body: body, BodyHTML: bodyHTML, Preview: preview, Unread: unread == 1, IsSystem: isSystem, CreatedAt: time.Now()}, nil
}

func (s *Service) deleteEmailByToken(userID string, emailToken string) error {
	_, err := s.db.Exec(`DELETE FROM emails WHERE token = ? AND user_id = ?`, emailToken, userID)
	return err
}

func (s *Service) moveEmailByToken(userID string, emailToken, folder string) error {
	if folder == "trash" {
		_, err := s.db.Exec(`UPDATE emails SET previous_folder = folder, folder = ? WHERE token = ? AND user_id = ?`, folder, emailToken, userID)
		return err
	}
	_, err := s.db.Exec(`UPDATE emails SET folder = ? WHERE token = ? AND user_id = ?`, folder, emailToken, userID)
	return err
}

func (s *Service) restoreEmailByToken(userID string, emailToken string) (string, error) {
	var previousFolder string
	err := s.db.QueryRow(`SELECT previous_folder FROM emails WHERE token = ? AND user_id = ? AND folder = 'trash'`, emailToken, userID).Scan(&previousFolder)
	if err != nil {
		return "inbox", err
	}
	if previousFolder == "" || previousFolder == "trash" {
		previousFolder = "inbox"
	}
	_, err = s.db.Exec(`UPDATE emails SET folder = ?, previous_folder = '' WHERE token = ? AND user_id = ?`, previousFolder, emailToken, userID)
	return previousFolder, err
}

func (s *Service) createAttachment(emailID int64, attachToken, filename, contentType string, size int64, filePath, encKey string) (*Attachment, error) {
	encFilename, _ := encryption.Encrypt(filename, encKey)
	res, err := s.db.Exec(`
		INSERT INTO attachments (token, email_id, filename, content_type, size, file_path)
		VALUES (?, ?, ?, ?, ?, ?)
	`, attachToken, emailID, encFilename, contentType, size, filePath)
	if err != nil {
		return nil, err
	}

	id, _ := res.LastInsertId()
	return &Attachment{ID: id, Token: attachToken, EmailID: emailID, Filename: filename, ContentType: contentType, Size: size, FilePath: filePath}, nil
}

func (s *Service) listAttachments(emailID int64, encKey string) ([]Attachment, error) {
	rows, err := s.db.Query(`
		SELECT id, token, email_id, filename, content_type, size, file_path
		FROM attachments WHERE email_id = ?
	`, emailID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var attachments []Attachment
	for rows.Next() {
		var a Attachment
		if err := rows.Scan(&a.ID, &a.Token, &a.EmailID, &a.Filename, &a.ContentType, &a.Size, &a.FilePath); err != nil {
			return nil, err
		}
		a.Filename, _ = encryption.Decrypt(a.Filename, encKey)
		attachments = append(attachments, a)
	}
	return attachments, nil
}

func (s *Service) getAttachmentByToken(attachToken, encKey string) (*Attachment, error) {
	var a Attachment
	err := s.db.QueryRow(`
		SELECT id, token, email_id, filename, content_type, size, file_path
		FROM attachments WHERE token = ?
	`, attachToken).Scan(&a.ID, &a.Token, &a.EmailID, &a.Filename, &a.ContentType, &a.Size, &a.FilePath)
	if err != nil {
		return nil, err
	}
	a.Filename, _ = encryption.Decrypt(a.Filename, encKey)
	return &a, nil
}

func (s *Service) getEmailIDByToken(emailToken string) (int64, error) {
	var id int64
	err := s.db.QueryRow(`SELECT id FROM emails WHERE token = ?`, emailToken).Scan(&id)
	return id, err
}

func (s *Service) listEmailsWithCursor(userID, folder, encKey string, limit int, cursor string) ([]Email, error) {
	var rows *sql.Rows
	var err error
	if cursor == "" {
		rows, err = s.db.Query(`
			SELECT id, token, user_id, folder, from_addr, to_addr, subject, body, body_html, preview, unread, is_system, created_at
			FROM emails WHERE user_id = ? AND folder = ?
			ORDER BY created_at DESC
			LIMIT ?
		`, userID, folder, limit)
	} else {
		cursorTime, _ := time.Parse(time.RFC3339Nano, cursor)
		rows, err = s.db.Query(`
			SELECT id, token, user_id, folder, from_addr, to_addr, subject, body, body_html, preview, unread, is_system, created_at
			FROM emails WHERE user_id = ? AND folder = ? AND created_at < ?
			ORDER BY created_at DESC
			LIMIT ?
		`, userID, folder, cursorTime, limit)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var emails []Email
	for rows.Next() {
		var e Email
		var unread, isSystem int
		if err := rows.Scan(&e.ID, &e.Token, &e.UserID, &e.Folder, &e.FromAddr, &e.ToAddr, &e.Subject, &e.Body, &e.BodyHTML, &e.Preview, &unread, &isSystem, &e.CreatedAt); err != nil {
			return nil, err
		}
		e.Subject, _ = encryption.Decrypt(e.Subject, encKey)
		e.Body, _ = encryption.Decrypt(e.Body, encKey)
		e.BodyHTML, _ = encryption.Decrypt(e.BodyHTML, encKey)
		e.Preview, _ = encryption.Decrypt(e.Preview, encKey)
		e.FromAddr, _ = encryption.Decrypt(e.FromAddr, encKey)
		e.ToAddr, _ = encryption.Decrypt(e.ToAddr, encKey)
		e.Unread = unread == 1
		e.IsSystem = isSystem == 1
		emails = append(emails, e)
	}
	return emails, nil
}

func (s *Service) countEmails(userID, folder, filter string, recipient []string) (int, error) {
	query := `SELECT COUNT(*) FROM emails WHERE user_id = ? AND folder = ?`
	args := []any{userID, folder}
	if filter == "unread" {
		query += ` AND unread = 1`
	} else if filter == "read" {
		query += ` AND unread = 0`
	} else if filter == "attachments" {
		query += ` AND id IN (SELECT email_id FROM attachments)`
	}
	if len(recipient) > 0 {
		placeholders := make([]string, len(recipient))
		for i, r := range recipient {
			placeholders[i] = "?"
			args = append(args, r)
		}
		addrColumn := "to_addr"
		if folder == "sent" {
			addrColumn = "from_addr"
		}
		query += ` AND ` + addrColumn + ` IN (` + strings.Join(placeholders, ",") + `)`
	}
	var count int
	err := s.db.QueryRow(query, args...).Scan(&count)
	return count, err
}


func (s *Service) getUnreadCounts(userID string) (map[string]int, error) {
	rows, err := s.db.Query(`
		SELECT folder, COUNT(*) FROM emails 
		WHERE user_id = ? AND unread = 1 
		GROUP BY folder
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	counts := make(map[string]int)
	for rows.Next() {
		var folder string
		var count int
		if err := rows.Scan(&folder, &count); err != nil {
			return nil, err
		}
		counts[folder] = count
	}
	return counts, nil
}