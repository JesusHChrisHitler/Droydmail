package verification

import (
	"database/sql"
	"time"
)

type EmailSender interface {
	SendVerificationEmail(toEmail, code string) error
}

type IdentityChecker interface {
	NameTaken(name string) bool
	EmailTaken(email string) bool
}

type Service struct {
	db              *sql.DB
	domain          string
	masterKey       string
	expiry          time.Duration
	sender          EmailSender
	identity        IdentityChecker
	reserved        []string
	blockedDomains  []string
}

func NewService(db *sql.DB, domain, masterKey string, expiryMinutes int, reserved, blockedDomains []string, identity IdentityChecker) *Service {
	return &Service{
		db:             db,
		domain:         domain,
		masterKey:      masterKey,
		expiry:         time.Duration(expiryMinutes) * time.Minute,
		reserved:       reserved,
		blockedDomains: blockedDomains,
		identity:       identity,
	}
}

func (s *Service) SetEmailSender(sender EmailSender) {
	s.sender = sender
}