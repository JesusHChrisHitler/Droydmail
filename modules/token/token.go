package token

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"math/big"
)

const (
	UserIDLen         = 10
	AliasIDLen        = 12
	SessionIDLen      = 32
	VerificationIDLen = 24
	ContactIDLen      = 12
)


func Generate(length int) string {
	const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
	result := make([]byte, length)
	for i := range result {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		if err != nil {
			panic("crypto/rand failed: " + err.Error())
		}
		result[i] = chars[n.Int64()]
	}
	return string(result)
}

func GenerateNumeric(length int) string {
	const chars = "0123456789"
	result := make([]byte, length)
	for i := range result {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		if err != nil {
			panic("crypto/rand failed: " + err.Error())
		}
		result[i] = chars[n.Int64()]
	}
	return string(result)
}

func GenerateBytes(length int) []byte {
	b := make([]byte, length)
	if _, err := rand.Read(b); err != nil {
		panic("crypto/rand failed: " + err.Error())
	}
	return b
}

func GenerateHex(byteLength int) string {
	return hex.EncodeToString(GenerateBytes(byteLength))
}

func GenerateBase64(byteLength int) string {
	return base64.RawURLEncoding.EncodeToString(GenerateBytes(byteLength))
}