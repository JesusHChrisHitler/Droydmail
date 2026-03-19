package identity

import (
	"database/sql"
	"strings"

	"georgedroyd.wtf/droydmail/modules/encryption"
	"georgedroyd.wtf/droydmail/modules/validation"
)

type Checker struct {
	db        *sql.DB
	masterKey string
}

func NewChecker(db *sql.DB, masterKey string) *Checker {
	return &Checker{db: db, masterKey: masterKey}
}

func (c *Checker) NameTaken(name string) bool {
	name = validation.Sanitize(name)
	return c.usernameExists(name) || c.aliasExists(name)
}

func (c *Checker) usernameExists(name string) bool {
	var count int
	nameIdx := encryption.HashIdentifier(strings.ToLower(name), c.masterKey)
	err := c.db.QueryRow(`SELECT COUNT(*) FROM users WHERE username_idx = ?`, nameIdx).Scan(&count)
	return err == nil && count > 0
}

func (c *Checker) aliasExists(name string) bool {
	var count int
	nameIdx := encryption.HashIdentifier(strings.ToLower(name), c.masterKey)
	err := c.db.QueryRow(`SELECT COUNT(*) FROM aliases WHERE alias_idx = ? AND deleted_at IS NULL`, nameIdx).Scan(&count)
	return err == nil && count > 0
}

func (c *Checker) EmailTaken(email string) bool {
	var count int
	emailIdx := encryption.HashIdentifier(strings.ToLower(email), c.masterKey)
	err := c.db.QueryRow(`SELECT COUNT(*) FROM users WHERE recovery_email_idx = ?`, emailIdx).Scan(&count)
	return err == nil && count > 0
}