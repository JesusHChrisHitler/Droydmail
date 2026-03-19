package validation

import (
	"net/mail"
	"strings"

	"georgedroyd.wtf/droydmail/modules/config"
)

func Email(email string, field string) *Error {
	email = strings.TrimSpace(email)
	if email == "" {
		return &Error{Field: field, Message: "Email is required"}
	}
	if len(email) > config.EmailMaxLength {
		return &Error{Field: field, Message: "Email address is too long"}
	}
	if _, err := mail.ParseAddress(email); err != nil {
		return &Error{Field: field, Message: "Invalid email address format"}
	}
	return nil
}

func RecoveryEmail(email string, appDomain string, blockedDomains []string) *Error {
	if err := Email(email, "email"); err != nil {
		return err
	}
	emailLower := strings.ToLower(email)
	if strings.HasSuffix(emailLower, "@"+appDomain) {
		return &Error{Field: "email", Message: "Cannot use " + appDomain + " email for verification"}
	}
	for _, blocked := range blockedDomains {
		if strings.HasSuffix(emailLower, "@"+blocked) {
			return &Error{Field: "email", Message: "This email domain is not allowed"}
		}
	}
	return nil
}