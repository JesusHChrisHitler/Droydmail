package contacts

import (
	"database/sql"
	"time"

	"georgedroyd.wtf/droydmail/modules/encryption"
	"georgedroyd.wtf/droydmail/modules/token"
)

type Contact struct {
	ID        string
	UserID    string
	Email     string
	Name      string
	AvatarURL string
	CreatedAt time.Time
	UpdatedAt time.Time
}

func Migrate(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS contacts (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			email TEXT NOT NULL,
			name TEXT NOT NULL,
			avatar_url TEXT NOT NULL DEFAULT '',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(user_id, email),
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		);
		CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
		CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
	`)
	return err
}

func (s *Service) createContact(userID, email, name, avatarURL, encKey string) (*Contact, error) {
	id := token.Generate(token.ContactIDLen)
	now := time.Now()
	encEmail, _ := encryption.Encrypt(email, encKey)
	encName, _ := encryption.Encrypt(name, encKey)
	_, err := s.db.Exec(
		`INSERT INTO contacts (id, user_id, email, name, avatar_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		id, userID, encEmail, encName, avatarURL, now, now,
	)
	if err != nil {
		return nil, err
	}
	return &Contact{ID: id, UserID: userID, Email: email, Name: name, AvatarURL: avatarURL, CreatedAt: now, UpdatedAt: now}, nil
}

func (s *Service) listContacts(userID, encKey string) ([]Contact, error) {
	rows, err := s.db.Query(`
		SELECT id, user_id, email, name, avatar_url, created_at, updated_at
		FROM contacts WHERE user_id = ? ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var contacts []Contact
	for rows.Next() {
		var c Contact
		var encEmail, encName string
		if err := rows.Scan(&c.ID, &c.UserID, &encEmail, &encName, &c.AvatarURL, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		c.Email, _ = encryption.Decrypt(encEmail, encKey)
		c.Name, _ = encryption.Decrypt(encName, encKey)
		contacts = append(contacts, c)
	}
	return contacts, nil
}

func (s *Service) getContactByID(userID, contactID, encKey string) (*Contact, error) {
	var c Contact
	var encEmail, encName string
	err := s.db.QueryRow(`
		SELECT id, user_id, email, name, avatar_url, created_at, updated_at
		FROM contacts WHERE id = ? AND user_id = ?
	`, contactID, userID).Scan(&c.ID, &c.UserID, &encEmail, &encName, &c.AvatarURL, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	c.Email, _ = encryption.Decrypt(encEmail, encKey)
	c.Name, _ = encryption.Decrypt(encName, encKey)
	return &c, nil
}

func (s *Service) getContactByEmail(userID, email, encKey string) (*Contact, error) {
	contacts, err := s.listContacts(userID, encKey)
	if err != nil {
		return nil, err
	}
	for _, c := range contacts {
		if c.Email == email {
			return &c, nil
		}
	}
	return nil, sql.ErrNoRows
}

func (s *Service) updateContact(userID, contactID, name, avatarURL, encKey string) error {
	encName, _ := encryption.Encrypt(name, encKey)
	_, err := s.db.Exec(`UPDATE contacts SET name = ?, avatar_url = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
		encName, avatarURL, time.Now(), contactID, userID)
	return err
}

func (s *Service) deleteContact(userID, contactID string) error {
	_, err := s.db.Exec(`DELETE FROM contacts WHERE id = ? AND user_id = ?`, contactID, userID)
	return err
}

func (s *Service) IsContact(userID, email, encKey string) bool {
	contact, err := s.getContactByEmail(userID, email, encKey)
	return err == nil && contact != nil
}