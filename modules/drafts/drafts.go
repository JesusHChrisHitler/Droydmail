package drafts

import (
	"database/sql"

	"georgedroyd.wtf/droydmail/modules/encryption"
)

type Service struct {
	db        *sql.DB
	masterKey string
}

func NewService(db *sql.DB, masterKey string) *Service {
	return &Service{db: db, masterKey: masterKey}
}

func (s *Service) getEncryptionKeyByUserID(userID string) (string, error) {
	var encryptedKey string
	err := s.db.QueryRow(`SELECT encryption_key FROM users WHERE id = ?`, userID).Scan(&encryptedKey)
	if err != nil {
		return "", err
	}
	return encryption.DecryptUserKey(encryptedKey, s.masterKey)
}