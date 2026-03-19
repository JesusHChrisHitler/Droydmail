package validation

import (
	"strings"

	"georgedroyd.wtf/droydmail/modules/config"
)

func Subject(subject string) *Error {
	subject = strings.TrimSpace(subject)
	if subject == "" {
		return &Error{Field: "subject", Message: "Subject is required"}
	}
	if len(subject) > config.SubjectMaxLength {
		return &Error{Field: "subject", Message: "Subject is too long"}
	}
	return nil
}

func Body(body string) *Error {
	if strings.TrimSpace(body) == "" {
		return &Error{Field: "body", Message: "Message body is required"}
	}
	if len(body) > config.BodyMaxLength {
		return &Error{Field: "body", Message: "Message is too large (max 1MB)"}
	}
	return nil
}

func Folder(folder string) *Error {
	valid := map[string]bool{"inbox": true, "sent": true, "trash": true, "spam": true, "promotions": true, "archive": true, "codes": true}
	if !valid[folder] {
		return &Error{Field: "folder", Message: "Invalid folder"}
	}
	return nil
}