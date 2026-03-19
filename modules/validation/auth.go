package validation

import (
	"regexp"
	"strings"
	"unicode"

	"georgedroyd.wtf/droydmail/modules/config"
)

var usernameRegex = regexp.MustCompile(`^[a-z0-9][a-z0-9._-]*[a-z0-9]$|^[a-z0-9]$`)
var aliasRegex = regexp.MustCompile(`^[a-z0-9]+$`)

func Username(username string, reserved []string) *Error {
	username = Sanitize(username)
	if len(username) < config.UsernameMinLength {
		return &Error{Field: "username", Message: "Username must be at least 3 characters"}
	}
	if len(username) > config.UsernameMaxLength {
		return &Error{Field: "username", Message: "Username must be at most 32 characters"}
	}
	if !usernameRegex.MatchString(username) {
		return &Error{Field: "username", Message: "Username can only contain letters, numbers, dots, underscores, and hyphens"}
	}
	if strings.Contains(username, "..") || strings.Contains(username, "--") || strings.Contains(username, "__") {
		return &Error{Field: "username", Message: "Username cannot contain consecutive special characters"}
	}
	for _, r := range reserved {
		if username == r {
			return &Error{Field: "username", Message: "This username is reserved"}
		}
	}
	return nil
}

func Alias(alias string, reserved []string) *Error {
	alias = Sanitize(alias)
	if len(alias) < config.AliasMinLength {
		return &Error{Field: "alias", Message: "Alias must be at least 3 characters"}
	}
	if len(alias) > config.AliasMaxLength {
		return &Error{Field: "alias", Message: "Alias must be at most 32 characters"}
	}
	if !aliasRegex.MatchString(alias) {
		return &Error{Field: "alias", Message: "Alias can only contain letters and numbers"}
	}
	for _, r := range reserved {
		if alias == r {
			return &Error{Field: "alias", Message: "This alias is reserved"}
		}
	}
	return nil
}

func Password(password string) *Error {
	if len(password) < config.PasswordMinLength {
		return &Error{Field: "password", Message: "Password must be at least 8 characters"}
	}
	if len(password) > config.PasswordMaxLength {
		return &Error{Field: "password", Message: "Password must be at most 128 characters"}
	}
	var hasUpper, hasLower, hasDigit bool
	for _, c := range password {
		switch {
		case unicode.IsUpper(c):
			hasUpper = true
		case unicode.IsLower(c):
			hasLower = true
		case unicode.IsDigit(c):
			hasDigit = true
		}
	}
	if !hasUpper || !hasLower || !hasDigit {
		return &Error{Field: "password", Message: "Password must contain uppercase, lowercase, and a number"}
	}
	return nil
}