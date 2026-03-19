package auth

import (
	"database/sql"
	"time"
	"strings"
	"georgedroyd.wtf/droydmail/modules/encryption"
	"georgedroyd.wtf/droydmail/modules/token"
)

type User struct {
	ID            string
	Username      string
	PasswordHash  string
	EncryptionKey string
	RecoveryEmail string
	RegisterIP    string
	LastLoginIP   string
	Role          string
	CreatedAt     time.Time
}

type Session struct {
	ID        string
	UserID    string
	IP        string
	UserAgent string
	ExpiresAt time.Time
	CreatedAt time.Time
}

func Migrate(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			username_idx TEXT NOT NULL,
			username_enc TEXT NOT NULL,
			password_hash TEXT NOT NULL,
			encryption_key TEXT NOT NULL DEFAULT '',
			recovery_email_idx TEXT,
			recovery_email_enc TEXT,
			register_ip TEXT NOT NULL,
			last_login_ip TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			role TEXT NOT NULL DEFAULT 'user'
		);

		CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_idx ON users(username_idx);
		CREATE INDEX IF NOT EXISTS idx_users_recovery_email_idx ON users(recovery_email_idx);

		CREATE TABLE IF NOT EXISTS sessions (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			expires_at DATETIME NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);

		CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
		CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
	`)
	if err != nil {
		return err
	}
	db.Exec(`ALTER TABLE sessions ADD COLUMN ip TEXT NOT NULL DEFAULT ''`)
	db.Exec(`ALTER TABLE sessions ADD COLUMN user_agent TEXT NOT NULL DEFAULT ''`)
	return err
}

func (s *Service) createUser(username, passwordHash, encryptionKey, recoveryEmail, ip, role string) (*User, error) {
	id := token.Generate(token.UserIDLen)
	hashedIP := encryption.HashIdentifier(ip, s.masterKey)
	usernameIdx, usernameEnc := encryption.EncryptIdentifier(username, s.masterKey)
	recoveryIdx, recoveryEnc := encryption.EncryptIdentifier(recoveryEmail, s.masterKey)
	_, err := s.db.Exec(
		`INSERT INTO users (id, username_idx, username_enc, password_hash, encryption_key, recovery_email_idx, recovery_email_enc, register_ip, last_login_ip, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		id, usernameIdx, usernameEnc, passwordHash, encryptionKey, recoveryIdx, recoveryEnc, hashedIP, hashedIP, role,
	)
	if err != nil {
		return nil, err
	}
	return &User{ID: id, Username: username, PasswordHash: passwordHash, EncryptionKey: encryptionKey, RecoveryEmail: recoveryEmail, RegisterIP: ip, Role: role, CreatedAt: time.Now()}, nil
}

func (s *Service) getUserByUsername(username string) (*User, error) {
	var u User
	var encryptedKey string
	var usernameEnc, recoveryEnc string
	usernameIdx := encryption.HashIdentifier(strings.ToLower(username), s.masterKey)
	err := s.db.QueryRow(
		`SELECT id, username_enc, password_hash, encryption_key, recovery_email_enc, register_ip, last_login_ip, role, created_at FROM users WHERE username_idx = ?`,
		usernameIdx,
	).Scan(&u.ID, &usernameEnc, &u.PasswordHash, &encryptedKey, &recoveryEnc, &u.RegisterIP, &u.LastLoginIP, &u.Role, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	decryptedKey, err := encryption.DecryptUserKey(encryptedKey, s.masterKey)
	if err != nil {
		return nil, err
	}
	u.EncryptionKey = decryptedKey
	u.Username, _ = encryption.DecryptWithMaster(usernameEnc, s.masterKey)
	u.RecoveryEmail, _ = encryption.DecryptWithMaster(recoveryEnc, s.masterKey)
	return &u, nil
}

func (s *Service) getUserByID(id string) (*User, error) {
	var u User
	var encryptedKey string
	var usernameEnc, recoveryEnc string
	err := s.db.QueryRow(
		`SELECT id, username_enc, password_hash, encryption_key, recovery_email_enc, register_ip, last_login_ip, role, created_at FROM users WHERE id = ?`,
		id,
	).Scan(&u.ID, &usernameEnc, &u.PasswordHash, &encryptedKey, &recoveryEnc, &u.RegisterIP, &u.LastLoginIP, &u.Role, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	decryptedKey, err := encryption.DecryptUserKey(encryptedKey, s.masterKey)
	if err != nil {
		return nil, err
	}
	u.EncryptionKey = decryptedKey
	u.Username, _ = encryption.DecryptWithMaster(usernameEnc, s.masterKey)
	u.RecoveryEmail, _ = encryption.DecryptWithMaster(recoveryEnc, s.masterKey)
	return &u, nil
}

func (s *Service) updateLastLoginIP(userID string, ip string) error {
	_, err := s.db.Exec(`UPDATE users SET last_login_ip = ? WHERE id = ?`, encryption.HashIdentifier(ip, s.masterKey), userID)
	return err
}

func (s *Service) createSession(userID, sessionID, ip, userAgent string, expiresAt time.Time) error {
	_, err := s.db.Exec(
		`INSERT INTO sessions (id, user_id, ip, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)`,
		sessionID, userID, encryption.HashIdentifier(ip, s.masterKey), userAgent, expiresAt,
	)
	return err
}

func (s *Service) getUserSessions(userID string) ([]Session, error) {
	rows, err := s.db.Query(
		`SELECT id, user_id, ip, user_agent, expires_at, created_at FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY created_at DESC`,
		userID, time.Now(),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var sessions []Session
	for rows.Next() {
		var sess Session
		if err := rows.Scan(&sess.ID, &sess.UserID, &sess.IP, &sess.UserAgent, &sess.ExpiresAt, &sess.CreatedAt); err != nil {
			continue
		}
		sessions = append(sessions, sess)
	}
	return sessions, nil
}

func (s *Service) getSession(sessionID string) (*Session, error) {
	var sess Session
	err := s.db.QueryRow(
		`SELECT id, user_id, expires_at, created_at FROM sessions WHERE id = ? AND expires_at > ?`,
		sessionID, time.Now(),
	).Scan(&sess.ID, &sess.UserID, &sess.ExpiresAt, &sess.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &sess, nil
}

func (s *Service) deleteSession(sessionID string) error {
	_, err := s.db.Exec(`DELETE FROM sessions WHERE id = ?`, sessionID)
	return err
}

func (s *Service) deleteUserSessions(userID string) error {
	_, err := s.db.Exec(`DELETE FROM sessions WHERE user_id = ?`, userID)
	return err
}

func (s *Service) cleanExpiredSessions() error {
	_, err := s.db.Exec(`DELETE FROM sessions WHERE expires_at < ?`, time.Now())
	return err
}