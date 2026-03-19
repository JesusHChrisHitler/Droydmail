package batch

import (
	"database/sql"
	"georgedroyd.wtf/droydmail/modules/attachments"
	"georgedroyd.wtf/droydmail/modules/notify"
)

type Service struct {
	db              *sql.DB
	masterKey       string
	storage         *attachments.Storage
	notifier        notify.Notifier
	mailNotifier    notify.MailNotifier
	storageNotifier notify.StorageNotifier
	countsProvider  notify.CountsProvider
}

func NewService(db *sql.DB, masterKey, storagePath string) *Service {
	return &Service{
		db:        db,
		masterKey: masterKey,
		storage:   attachments.NewStorage(storagePath),
	}
}

func (s *Service) SetNotifier(n notify.Notifier) {
	s.notifier = n
}

func (s *Service) SetMailNotifier(mn notify.MailNotifier) {
	s.mailNotifier = mn
}

func (s *Service) SetStorageNotifier(sn notify.StorageNotifier) {
	s.storageNotifier = sn
}

func (s *Service) SetCountsProvider(cp notify.CountsProvider) {
	s.countsProvider = cp
}

func (s *Service) notifyCountsUpdate(userID string) {
	notify.NotifyCountsUpdate(s.notifier, s.countsProvider, userID)
}