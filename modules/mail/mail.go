package mail

import (
	"database/sql"
	"strings"

	"georgedroyd.wtf/droydmail/modules/attachments"
	"georgedroyd.wtf/droydmail/modules/csrf"
	"georgedroyd.wtf/droydmail/modules/encryption"
	"georgedroyd.wtf/droydmail/modules/notify"
	"georgedroyd.wtf/droydmail/modules/classification"
	"georgedroyd.wtf/droydmail/modules/sanitize"
)

type StorageChecker interface {
	CanUpload(userID string, additionalSize int64) (bool, int64, int64)
}

type AliasResolver interface {
	GetUserByAlias(alias string) (string, error)
}

type Service struct {
	aliasResolver   AliasResolver
	notifier        notify.Notifier
	storageChecker  StorageChecker
	storageNotifier notify.StorageNotifier
	mailNotifier    notify.MailNotifier
	classifier      *classification.Classifier
	db             *sql.DB
	domain         string
	masterKey      string
	csrf           *csrf.Service
	deliveryKey    string
	smtpRelay      string
	sanitizer      *sanitize.Sanitizer
	storage        *attachments.Storage
	maxFileSize    int64
	maxAttachments int
	maxTotalSize   int64
}

func NewService(db *sql.DB, domain, masterKey, deliveryKey, smtpRelay, storagePath string, maxFileSize, maxTotalSize int64, maxAttachments int, csrfSvc *csrf.Service) *Service {
	return &Service{
		db:             db,
		domain:         domain,
		masterKey:      masterKey,
		deliveryKey:    deliveryKey,
		smtpRelay:      smtpRelay,
		csrf:           csrfSvc,
		sanitizer:      sanitize.New(),
		storage:        attachments.NewStorage(storagePath),
		maxFileSize:    maxFileSize,
		maxAttachments: maxAttachments,
		maxTotalSize:   maxTotalSize,
	}
}

func (s *Service) getUserIDByUsername(username string) (string, error) {
	var id string
	usernameIdx := encryption.HashIdentifier(strings.ToLower(username), s.masterKey)
	err := s.db.QueryRow(`SELECT id FROM users WHERE username_idx = ?`, usernameIdx).Scan(&id)
	return id, err
}

func (s *Service) getUserByUsername(username string) (string, string, error) {
	var id string
	var encryptedKey string
	usernameIdx := encryption.HashIdentifier(strings.ToLower(username), s.masterKey)
	err := s.db.QueryRow(`SELECT id, encryption_key FROM users WHERE username_idx = ?`, usernameIdx).Scan(&id, &encryptedKey)
	if err != nil {
		return "", "", err
	}
	decryptedKey, err := encryption.DecryptUserKey(encryptedKey, s.masterKey)
	if err != nil {
		return "", "", err
	}
	return id, decryptedKey, nil
}

func (s *Service) getEncryptionKeyByUserID(userID string) (string, error) {
	var encryptedKey string
	err := s.db.QueryRow(`SELECT encryption_key FROM users WHERE id = ?`, userID).Scan(&encryptedKey)
	if err != nil {
		return "", err
	}
	return encryption.DecryptUserKey(encryptedKey, s.masterKey)
}

func normalizeLocalPart(local string) string {
	return strings.ReplaceAll(local, ".", "")
}

func (s *Service) SetNotifier(n notify.Notifier) {
	s.notifier = n
}

func (s *Service) SetStorageChecker(sc StorageChecker) {
	s.storageChecker = sc
}

func (s *Service) SetStorageNotifier(sn notify.StorageNotifier) {
	s.storageNotifier = sn
}

func (s *Service) SetClassifier(c *classification.Classifier) {
	s.classifier = c
}

func (s *Service) SetAliasResolver(ar AliasResolver) {
	s.aliasResolver = ar
}

func (s *Service) SetMailNotifier(mn notify.MailNotifier) {
	s.mailNotifier = mn
}

func (s *Service) GetUnreadCounts(userID string) map[string]int {
	counts, _ := s.getUnreadCounts(userID)
	return counts
}

func (s *Service) notifyCountsUpdate(userID string) {
	notify.NotifyCountsUpdate(s.notifier, s, userID)
}

func (s *Service) SendVerificationEmail(toEmail, code string) error {
	from := "verification@" + s.domain
	subject := "DroydMail Verification Code"
	textBody := "Your verification code is: " + code + "\n\nThis code expires in 15 minutes.\n\nVisit https://" + s.domain + "/register to complete registration."
	htmlBody := `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0a0a14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a14;padding:40px 20px;">
<tr><td align="center">
<table width="100%" style="max-width:480px;background-color:#12121e;border-radius:16px;border:1px solid #2d2d44;">
<tr><td style="padding:40px 32px;text-align:center;">
<div style="width:64px;height:64px;background:linear-gradient(135deg,#6d28d9,#a78bfa);border-radius:16px;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;">
<span style="font-size:28px;color:white;font-weight:bold;">D</span>
</div>
<h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0 0 8px;">Verification Code</h1>
<p style="color:#9ca3af;font-size:14px;margin:0 0 32px;">Enter this code to verify your email</p>
<div style="background-color:#1a1a2e;border:2px solid #6d28d9;border-radius:12px;padding:20px;margin-bottom:32px;">
<span style="font-family:monospace;font-size:32px;font-weight:700;color:#a78bfa;letter-spacing:8px;">` + code + `</span>
</div>
<p style="color:#6b7280;font-size:12px;margin:0 0 24px;">This code expires in 15 minutes</p>
<a href="https://` + s.domain + `/register" style="display:inline-block;background:linear-gradient(135deg,#6d28d9,#7c3aed);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">Continue Registration</a>
</td></tr>
<tr><td style="padding:24px 32px;border-top:1px solid #2d2d44;text-align:center;">
<p style="color:#4b5563;font-size:12px;margin:0;">DroydMail • Secure Email by Negrotech</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
	return s.sendHTMLViaSMTP(from, toEmail, subject, textBody, htmlBody)
}

func (s *Service) SendWelcomeEmail(userID string, username string) error {
	encKey, err := s.getEncryptionKeyByUserID(userID)
	if err != nil {
		return err
	}
	toAddr := username + "@" + s.domain
	fromAddr := "system@" + s.domain
	subject := "Welcome to DroydMail!"
	body := "Welcome to DroydMail, " + username + "!\n\nYour email address is: " + toAddr + "\n\nYou can now send and receive secure emails.\n\nJoin our Discord community: https://discord.gg/H4e9P56nYz\n\n— The DroydMail Team"
	bodyHTML := `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0a0a14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a14;padding:40px 20px;">
<tr><td align="center">
<table width="100%" style="max-width:480px;background-color:#12121e;border-radius:16px;border:1px solid #2d2d44;">
<tr><td style="padding:40px 32px;text-align:center;">
<div style="width:64px;height:64px;background:linear-gradient(135deg,#6d28d9,#a78bfa);border-radius:16px;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;">
<span style="font-size:28px;color:white;font-weight:bold;">D</span>
</div>
<h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0 0 8px;">Welcome to DroydMail!</h1>
<p style="color:#9ca3af;font-size:14px;margin:0 0 24px;">Your secure email is ready</p>
<div style="background-color:#1a1a2e;border:1px solid #2d2d44;border-radius:12px;padding:24px;margin-bottom:24px;text-align:left;">
<p style="color:#9ca3af;font-size:13px;margin:0 0 4px;">Username</p>
<p style="color:#ffffff;font-size:16px;font-weight:600;margin:0 0 16px;">` + username + `</p>
<p style="color:#9ca3af;font-size:13px;margin:0 0 4px;">Email Address</p>
<p style="color:#a78bfa;font-size:16px;font-weight:600;margin:0;">` + toAddr + `</p>
</div>
<p style="color:#9ca3af;font-size:14px;margin:0 0 24px;">You can now send and receive secure, encrypted emails.</p>
<a href="https://` + s.domain + `/inbox" style="display:inline-block;background:linear-gradient(135deg,#6d28d9,#7c3aed);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;margin-bottom:12px;">Go to Inbox</a>
<br>
<a href="https://discord.gg/H4e9P56nYz" style="display:inline-block;color:#a78bfa;font-size:13px;font-weight:500;text-decoration:none;padding:10px 24px;border:1px solid #2d2d44;border-radius:10px;margin-top:12px;">Join our Discord</a>
</td></tr>
<tr><td style="padding:24px 32px;border-top:1px solid #2d2d44;text-align:center;">
<p style="color:#4b5563;font-size:12px;margin:0;">DroydMail • Secure Email by Negrotech</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
	_, err = s.createEmail(userID, "inbox", fromAddr, toAddr, "", subject, body, bodyHTML, true, encKey)
	return err
}