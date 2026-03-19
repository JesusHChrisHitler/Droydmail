package notify

type Notifier interface {
	NotifyEmail(userID, token, from, to, subject, preview, folder, timeStr string, unread, isSystem, hasAttachments bool)
	NotifyUnreadCounts(userID string, counts map[string]int)
	NotifyAdminReport(token, from, subject, preview string)
}

type MailNotifier interface {
	NotifyMailMove(userID, token, fromFolder, toFolder, emailToken, from, to, subject, preview, timeStr string, unread, isSystem, hasAttachments bool)
	NotifyMailDelete(userID string, emailToken string)
	NotifyBatchDelete(userID string, tokens []string)
}

type StorageNotifier interface {
	NotifyStorageChange(userID string)
}

type StorageUINotifier interface {
	NotifyStorage(userID string, used, limit int64, percent float64)
}

type ContactsNotifier interface {
	NotifyContacts(userID string)
}

type AliasNotifier interface {
	NotifyAliasCreate(userID, id, alias, email, createdAt string)
	NotifyAliasDelete(userID, id, email string)
}

type RoleNotifier interface {
	NotifyRoleChange(userID, role string)
}

type AdminNotifier interface {
	NotifyRoleChange(userID, role string)
	NotifyAdminCounts(count int)
}

type CountsProvider interface {
	GetUnreadCounts(userID string) map[string]int
}

func NotifyCountsUpdate(n Notifier, cp CountsProvider, userID string) {
	if n != nil && cp != nil {
		n.NotifyUnreadCounts(userID, cp.GetUnreadCounts(userID))
	}
}