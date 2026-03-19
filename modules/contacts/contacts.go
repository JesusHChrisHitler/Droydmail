package contacts

import (
	"database/sql"
	"os"
	"path/filepath"

	"georgedroyd.wtf/droydmail/modules/encryption"
	"georgedroyd.wtf/droydmail/modules/logger"
	"georgedroyd.wtf/droydmail/modules/notify"
)

type StorageChecker interface {
	CanUpload(userID string, size int64) (bool, int64, int64)
}

type Service struct {
	db               *sql.DB
	storageDir       string
	maxAvatarSize    int64
	storageChecker   StorageChecker
	storageNotifier  notify.StorageNotifier
	contactsNotifier notify.ContactsNotifier
}

func NewService(db *sql.DB, storageDir string, maxAvatarSize int64) *Service {
	return &Service{db: db, storageDir: storageDir, maxAvatarSize: maxAvatarSize}
}

func (s *Service) SetStorageChecker(sc StorageChecker) {
	s.storageChecker = sc
}

func (s *Service) SetStorageNotifier(sn notify.StorageNotifier) {
	s.storageNotifier = sn
}

func (s *Service) SetContactsNotifier(cn notify.ContactsNotifier) {
	s.contactsNotifier = cn
}

func (s *Service) notifyStorage(userID string) {
	if s.storageNotifier != nil {
		s.storageNotifier.NotifyStorageChange(userID)
	}
}

func (s *Service) notifyContacts(userID string) {
	if s.contactsNotifier != nil {
		s.contactsNotifier.NotifyContacts(userID)
	}
}

func (s *Service) saveAvatar(userID, contactID string, data []byte, ext, encKey string) (string, error) {
	dir := filepath.Join(s.storageDir, userID)
	if err := os.MkdirAll(dir, 0755); err != nil {
		logger.Error("contacts: mkdir failed", "error", err, "dir", dir)
		return "", ErrStorageFailed
	}
	encData, err := encryption.EncryptBytes(data, encKey)
	if err != nil {
		logger.Error("contacts: avatar encryption failed", "error", err)
		return "", ErrStorageFailed
	}
	filename := contactID + ".enc"
	filePath := filepath.Join(dir, filename)
	if err := os.WriteFile(filePath, encData, 0644); err != nil {
		logger.Error("contacts: avatar save failed", "error", err, "path", filePath)
		return "", ErrStorageFailed
	}
	return filename, nil
}

func (s *Service) deleteAvatar(userID, avatarURL string) {
	if avatarURL == "" {
		return
	}
	filePath := filepath.Join(s.storageDir, userID, avatarURL)
	os.Remove(filePath)
}