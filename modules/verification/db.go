package verification

import (
	"database/sql"
	"strings"
	"time"

	"georgedroyd.wtf/droydmail/modules/encryption"
	"georgedroyd.wtf/droydmail/modules/token"
)

type PendingVerification struct {
	ID            string
	Username      string
	PasswordHash  string
	RecoveryEmail string
	Code          string
	ExpiresAt     time.Time
	CreatedAt     time.Time
}

func Migrate(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS pending_verifications (
			id TEXT PRIMARY KEY,
			username_idx TEXT NOT NULL,
			username_enc TEXT NOT NULL,
			password_hash TEXT NOT NULL,
			recovery_email_idx TEXT,
			recovery_email_enc TEXT,
			code TEXT NOT NULL,
			ip TEXT NOT NULL,
			expires_at DATETIME NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);

		CREATE INDEX IF NOT EXISTS idx_pending_username_idx ON pending_verifications(username_idx);
		CREATE INDEX IF NOT EXISTS idx_pending_expires ON pending_verifications(expires_at);
	`)
	return err
}

func (s *Service) createPending(username, passwordHash, email, code, ip string) (*PendingVerification, error) {
	id := token.Generate(token.VerificationIDLen)
	expiresAt := time.Now().Add(s.expiry)
	hashedIP := encryption.HashIdentifier(ip, s.masterKey)
	usernameIdx, usernameEnc := encryption.EncryptIdentifier(username, s.masterKey)
	emailIdx, emailEnc := encryption.EncryptIdentifier(email, s.masterKey)

	if _, err := s.db.Exec(`DELETE FROM pending_verifications WHERE username_idx = ? OR recovery_email_idx = ?`, usernameIdx, emailIdx); err != nil {
		return nil, err
	}

	_, err := s.db.Exec(
		`INSERT INTO pending_verifications (id, username_idx, username_enc, password_hash, recovery_email_idx, recovery_email_enc, code, ip, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		id, usernameIdx, usernameEnc, passwordHash, emailIdx, emailEnc, code, hashedIP, expiresAt,
	)
	if err != nil {
		return nil, err
	}
	return &PendingVerification{
		ID:            id,
		Username:      username,
		PasswordHash:  passwordHash,
		RecoveryEmail: email,
		Code:          code,
		ExpiresAt:     expiresAt,
	}, nil
}

func (s *Service) getPendingByUsername(username string) (*PendingVerification, error) {
	var p PendingVerification
	var usernameEnc, emailEnc string
	usernameIdx := encryption.HashIdentifier(strings.ToLower(username), s.masterKey)
	err := s.db.QueryRow(
		`SELECT id, username_enc, password_hash, recovery_email_enc, code, expires_at, created_at FROM pending_verifications WHERE username_idx = ? AND expires_at > ?`,
		usernameIdx, time.Now(),
	).Scan(&p.ID, &usernameEnc, &p.PasswordHash, &emailEnc, &p.Code, &p.ExpiresAt, &p.CreatedAt)
	if err != nil {
		return nil, err
	}
	p.Username, _ = encryption.DecryptWithMaster(usernameEnc, s.masterKey)
	p.RecoveryEmail, _ = encryption.DecryptWithMaster(emailEnc, s.masterKey)
	return &p, nil
}

func (s *Service) deletePending(id string) error {
	_, err := s.db.Exec(`DELETE FROM pending_verifications WHERE id = ?`, id)
	return err
}

func (s *Service) cleanExpired() error {
	_, err := s.db.Exec(`DELETE FROM pending_verifications WHERE expires_at < ?`, time.Now())
	return err
}