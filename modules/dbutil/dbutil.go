package dbutil

import (
	"database/sql"
	"strings"
	"time"
)

func FormatTime(t time.Time) string {
	return t.UTC().Format(time.RFC3339)
}

func CountAttachments(db *sql.DB, emailID int64) int {
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM attachments WHERE email_id = ?`, emailID).Scan(&count)
	return count
}

func Placeholders(n int) string {
	p := make([]string, n)
	for i := range p {
		p[i] = "?"
	}
	return strings.Join(p, ",")
}

func TokenArgs(tokens []string) (string, []any) {
	args := make([]any, len(tokens))
	for i, t := range tokens {
		args[i] = t
	}
	return Placeholders(len(tokens)), args
}