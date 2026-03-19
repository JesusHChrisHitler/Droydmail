package admin

import (
	"database/sql"

	"georgedroyd.wtf/droydmail/modules/notify"
)

type Service struct {
	db        *sql.DB
	masterKey string
	domain    string
	notifier  notify.AdminNotifier
}

func NewService(db *sql.DB, masterKey, domain string, notifier notify.AdminNotifier) *Service {
	return &Service{db: db, masterKey: masterKey, domain: domain, notifier: notifier}
}

func (s *Service) SetNotifier(n notify.AdminNotifier) {
	s.notifier = n
}

func (s *Service) NotifyAdminCounts(userID string) {
	if s.notifier != nil {
		s.notifier.NotifyAdminCounts(s.GetUnreadReportCount())
	}
}