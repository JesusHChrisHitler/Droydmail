// New file - modules/admin/db.go
package admin

import (
	"strings"
	"time"

	"georgedroyd.wtf/droydmail/modules/encryption"
)

type UserInfo struct {
	ID            string    `json:"id"`
	Username      string    `json:"username"`
	Email         string    `json:"email"`
	Role          string    `json:"role"`
	RecoveryEmail string    `json:"recovery_email,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

type ReportEmail struct {
	ID        int64     `json:"id"`
	Token     string    `json:"token"`
	FromAddr  string    `json:"from_addr"`
	Subject   string    `json:"subject"`
	Preview   string    `json:"preview"`
	Unread    bool      `json:"unread"`
	CreatedAt time.Time `json:"created_at"`
}

func (s *Service) listUsers() ([]UserInfo, error) {
	rows, err := s.db.Query(`
		SELECT id, username_enc, recovery_email_enc, role, created_at 
		FROM users ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []UserInfo
	for rows.Next() {
		var u UserInfo
		var usernameEnc, recoveryEnc string
		if err := rows.Scan(&u.ID, &usernameEnc, &recoveryEnc, &u.Role, &u.CreatedAt); err != nil {
			continue
		}
		u.Username, _ = encryption.DecryptWithMaster(usernameEnc, s.masterKey)
		u.RecoveryEmail, _ = encryption.DecryptWithMaster(recoveryEnc, s.masterKey)
		u.Email = u.Username + "@" + s.domain
		users = append(users, u)
	}
	return users, nil
}

func (s *Service) updateRole(userID, role string) (int64, error) {
	res, err := s.db.Exec(`UPDATE users SET role = ? WHERE id = ?`, role, userID)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

type UserDetail struct {
	ID            string    `json:"id"`
	Username      string    `json:"username"`
	Email         string    `json:"email"`
	Role          string    `json:"role"`
	RecoveryEmail string    `json:"recovery_email,omitempty"`
	RegisterIP    string    `json:"register_ip"`
	LastLoginIP   string    `json:"last_login_ip,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

func (s *Service) getUser(userID string) (*UserDetail, error) {
	var u UserDetail
	var usernameEnc, recoveryEnc, registerIP, lastLoginIP string
	err := s.db.QueryRow(`
		SELECT id, username_enc, recovery_email_enc, role, register_ip, last_login_ip, created_at 
		FROM users WHERE id = ?
	`, userID).Scan(&u.ID, &usernameEnc, &recoveryEnc, &u.Role, &registerIP, &lastLoginIP, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	u.Username, _ = encryption.DecryptWithMaster(usernameEnc, s.masterKey)
	u.RecoveryEmail, _ = encryption.DecryptWithMaster(recoveryEnc, s.masterKey)
	u.RegisterIP = registerIP
	u.LastLoginIP = lastLoginIP
	u.Email = u.Username + "@" + s.domain
	return &u, nil
}

type ReportEmailDetail struct {
	ID          int64       `json:"id"`
	Token       string      `json:"token"`
	FromAddr    string      `json:"from_addr"`
	ToAddr      string      `json:"to_addr"`
	Subject     string      `json:"subject"`
	Body        string      `json:"body"`
	BodyHTML    string      `json:"body_html"`
	Attachments interface{} `json:"attachments"`
	CreatedAt   time.Time   `json:"created_at"`
}

func (s *Service) getReport(token string) (*ReportEmailDetail, error) {
	var r ReportEmailDetail
	err := s.db.QueryRow(`
		SELECT id, token, from_addr, to_addr, subject, body, body_html, created_at 
		FROM report_emails WHERE token = ?
	`, token).Scan(&r.ID, &r.Token, &r.FromAddr, &r.ToAddr, &r.Subject, &r.Body, &r.BodyHTML, &r.CreatedAt)
	if err != nil {
		return nil, err
	}

	s.db.Exec(`UPDATE report_emails SET unread = 0 WHERE token = ?`, token)

	return &r, nil
}

func (s *Service) listReports(limit, offset int) ([]ReportEmail, int, error) {
	var total int
	s.db.QueryRow(`SELECT COUNT(*) FROM report_emails`).Scan(&total)

	rows, err := s.db.Query(`
		SELECT id, token, from_addr, subject, preview, unread, created_at 
		FROM report_emails ORDER BY created_at DESC LIMIT ? OFFSET ?
	`, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var reports []ReportEmail
	for rows.Next() {
		var r ReportEmail
		var unread int
		if err := rows.Scan(&r.ID, &r.Token, &r.FromAddr, &r.Subject, &r.Preview, &unread, &r.CreatedAt); err != nil {
			continue
		}
		r.Unread = unread == 1
		reports = append(reports, r)
	}
	return reports, total, nil
}

func (s *Service) deleteReport(token string) error {
	_, err := s.db.Exec(`DELETE FROM report_emails WHERE token = ?`, token)
	return err
}

func (s *Service) GetUnreadReportCount() int {
	var count int
	s.db.QueryRow(`SELECT COUNT(*) FROM report_emails WHERE unread = 1`).Scan(&count)
	return count
}

func (s *Service) bulkDeleteReports(tokens []string) error {
	if len(tokens) == 0 {
		return nil
	}
	query := `DELETE FROM report_emails WHERE token IN (?` + strings.Repeat(",?", len(tokens)-1) + `)`
	args := make([]interface{}, len(tokens))
	for i, t := range tokens {
		args[i] = t
	}
	_, err := s.db.Exec(query, args...)
	return err
}