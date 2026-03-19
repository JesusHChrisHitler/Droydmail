package mail

import "georgedroyd.wtf/droydmail/modules/validation"

type ValidationError = validation.Error

func ValidateEmail(email string) *ValidationError {
	return validation.Email(email, "to")
}

func ValidateSubject(subject string) *ValidationError {
	return validation.Subject(subject)
}

func ValidateBody(body string) *ValidationError {
	return validation.Body(body)
}

func ValidateFolder(folder string) *ValidationError {
	return validation.Folder(folder)
}

func SanitizeEmail(email string) string {
	return validation.Sanitize(email)
}

func SanitizeSubject(subject string) string {
	return validation.TrimSpace(subject)
}

func containsCRLF(s string) bool {
	return validation.ContainsCRLF(s)
}