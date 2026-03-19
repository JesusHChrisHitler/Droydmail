package attachments

import (
	"os"
	"path/filepath"

	"georgedroyd.wtf/droydmail/modules/encryption"
	"georgedroyd.wtf/droydmail/modules/logger"
)

type Storage struct {
	basePath string
}

func NewStorage(basePath string) *Storage {
	if err := os.MkdirAll(basePath, 0755); err != nil {
		logger.Error("attachments: failed to create storage dir", "error", err, "path", basePath)
	}
	return &Storage{basePath: basePath}
}

func (s *Storage) Save(emailToken, attachToken string, data []byte, encKey string) (string, error) {
	dir := filepath.Join(s.basePath, emailToken)
	if err := os.MkdirAll(dir, 0755); err != nil {
		logger.Error("attachments: mkdir failed", "error", err, "dir", dir)
		return "", ErrStorageFailed
	}

	encData, err := encryption.EncryptBytes(data, encKey)
	if err != nil {
		logger.Error("attachments: encryption failed", "error", err)
		return "", ErrStorageFailed
	}

	filePath := filepath.Join(dir, attachToken+".enc")
	if err := os.WriteFile(filePath, encData, 0644); err != nil {
		logger.Error("attachments: write failed", "error", err, "path", filePath)
		return "", ErrStorageFailed
	}

	logger.Info("attachments: saved", "path", filePath, "size", len(data))
	return filePath, nil
}

func (s *Storage) Load(filePath, encKey string) ([]byte, error) {
	encData, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, ErrNotFound
		}
		logger.Error("attachments: read failed", "error", err, "path", filePath)
		return nil, ErrStorageFailed
	}

	data, err := encryption.DecryptBytes(encData, encKey)
	if err != nil {
		logger.Error("attachments: decryption failed", "error", err)
		return nil, ErrStorageFailed
	}

	return data, nil
}

func (s *Storage) Delete(emailToken string) error {
	dir := filepath.Join(s.basePath, emailToken)
	if err := os.RemoveAll(dir); err != nil {
		logger.Error("attachments: delete failed", "error", err, "dir", dir)
		return ErrStorageFailed
	}
	logger.Info("attachments: deleted dir", "dir", dir)
	return nil
}