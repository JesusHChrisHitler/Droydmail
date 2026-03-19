package encryption

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"strings"

	"georgedroyd.wtf/droydmail/modules/token"
)

var ErrDecryptionFailed = errors.New("decryption failed")

func GenerateKey() string {
	return base64.StdEncoding.EncodeToString(token.GenerateBytes(32))
}

func DeriveKeyFromMaster(masterKey string) []byte {
	hash := sha256.Sum256([]byte(masterKey))
	return hash[:]
}

func HashIdentifier(value, masterKey string) string {
	salt := DeriveKeyFromMaster(masterKey)
	hash := sha256.Sum256(append([]byte(value), salt...))
	return base64.RawURLEncoding.EncodeToString(hash[:])[:16]
}

func EncryptIdentifier(value, masterKey string) (idx string, enc string) {
	idx = HashIdentifier(strings.ToLower(value), masterKey)
	enc, _ = EncryptWithMaster(value, masterKey)
	return
}

func encryptWithKey(plaintext []byte, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonce := token.GenerateBytes(gcm.NonceSize())
	return gcm.Seal(nonce, nonce, plaintext, nil), nil
}

func decryptWithKey(ciphertext []byte, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, ErrDecryptionFailed
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, ErrDecryptionFailed
	}
	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return nil, ErrDecryptionFailed
	}
	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, ErrDecryptionFailed
	}
	return plaintext, nil
}

func EncryptUserKey(userKeyBase64, masterKey string) (string, error) {
	derivedKey := DeriveKeyFromMaster(masterKey)
	ciphertext, err := encryptWithKey([]byte(userKeyBase64), derivedKey)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func DecryptUserKey(encryptedKeyBase64, masterKey string) (string, error) {
	if encryptedKeyBase64 == "" {
		return "", ErrDecryptionFailed
	}
	ciphertext, err := base64.StdEncoding.DecodeString(encryptedKeyBase64)
	if err != nil {
		return "", ErrDecryptionFailed
	}
	derivedKey := DeriveKeyFromMaster(masterKey)
	plaintext, err := decryptWithKey(ciphertext, derivedKey)
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}

func EncryptWithMaster(plaintext, masterKey string) (string, error) {
	if plaintext == "" {
		return "", nil
	}
	derivedKey := DeriveKeyFromMaster(masterKey)
	ciphertext, err := encryptWithKey([]byte(plaintext), derivedKey)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func DecryptWithMaster(ciphertextBase64, masterKey string) (string, error) {
	if ciphertextBase64 == "" {
		return "", nil
	}
	ciphertext, err := base64.StdEncoding.DecodeString(ciphertextBase64)
	if err != nil {
		return "", ErrDecryptionFailed
	}
	derivedKey := DeriveKeyFromMaster(masterKey)
	plaintext, err := decryptWithKey(ciphertext, derivedKey)
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}

func Encrypt(plaintext, keyBase64 string) (string, error) {
	if plaintext == "" {
		return "", nil
	}
	key, err := base64.StdEncoding.DecodeString(keyBase64)
	if err != nil {
		return "", err
	}
	ciphertext, err := encryptWithKey([]byte(plaintext), key)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func Decrypt(ciphertextBase64, keyBase64 string) (string, error) {
	if ciphertextBase64 == "" {
		return "", nil
	}
	key, err := base64.StdEncoding.DecodeString(keyBase64)
	if err != nil {
		return "", ErrDecryptionFailed
	}
	ciphertext, err := base64.StdEncoding.DecodeString(ciphertextBase64)
	if err != nil {
		return "", ErrDecryptionFailed
	}
	plaintext, err := decryptWithKey(ciphertext, key)
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}