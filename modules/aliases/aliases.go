package aliases

import (
	"database/sql"

	"georgedroyd.wtf/droydmail/modules/notify"
)

type IdentityChecker interface {
	NameTaken(name string) bool
}

type Service struct {
	db         *sql.DB
	domain     string
	masterKey  string
	reserved   []string
	maxAliases int
	identity   IdentityChecker
	notifier   notify.AliasNotifier
}

func NewService(db *sql.DB, domain string, masterKey string, reserved []string, maxAliases int, identity IdentityChecker) *Service {
	return &Service{db: db, domain: domain, masterKey: masterKey, reserved: reserved, maxAliases: maxAliases, identity: identity}
}

func (s *Service) SetNotifier(n notify.AliasNotifier) {
	s.notifier = n
}