package classification

import (
	"regexp"
	"strings"
)

var codePatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?:^|[\s:])([0-9]{4,8})(?:[\s.]|$)`),
	regexp.MustCompile(`(?:^|[\s:])([A-Z0-9]{6,10})(?:[\s.]|$)`),
	regexp.MustCompile(`(?:^|[\s:])([0-9]{1,3}[- ][0-9]{3,6})(?:[\s.]|$)`),
}

func isCodes(from, subject string, headers map[string]string, body string) bool {
	subjectLower := strings.ToLower(subject)
	bodyLower := strings.ToLower(body)
	fromLower := strings.ToLower(from)

	codeSubjects := []string{
		"verification code", "verify your", "confirmation code",
		"security code", "login code", "authentication code",
		"one-time", "otp", "2fa", "two-factor",
		"sign in code", "signin code", "sign-in code",
		"access code", "pascode", "pin code",
		"reset code", "reset your password",
		"confirm your email", "confirm your account",
		"activate your account",
	}
	subjectMatch := false
	for _, p := range codeSubjects {
		if strings.Contains(subjectLower, p) {
			subjectMatch = true
			break
		}
	}

	codeSenders := []string{
		"noreply@", "no-reply@", "verify@", "security@",
		"auth@", "account@", "support@", "accounts@",
		"login@", "notifications@", "alert@", "verification@",
	}
	senderMatch := false
	for _, p := range codeSenders {
		if strings.Contains(fromLower, p) {
			senderMatch = true
			break
		}
	}

	bodySignals := []string{
		"verification code", "confirmation code", "security code",
		"one-time password", "one-time code", "otp",
		"enter this code", "enter the code", "use this code",
		"your code is", "your code:", "code is:",
		"expires in", "valid for", "do not share",
		"if you did not request", "if you didn't request",
		"sign in attempt", "login attempt",
	}
	bodyScore := 0
	for _, p := range bodySignals {
		if strings.Contains(bodyLower, p) {
			bodyScore++
		}
	}

	hasCode := false
	for _, re := range codePatterns {
		if re.MatchString(body) {
			hasCode = true
			break
		}
	}

	if subjectMatch && hasCode {
		return true
	}
	if subjectMatch && bodyScore >= 1 {
		return true
	}
	if senderMatch && bodyScore >= 2 && hasCode {
		return true
	}

	return false
}