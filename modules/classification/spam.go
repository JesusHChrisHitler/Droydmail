package classification

import (
	"strings"
	"unicode"
)

func isSpam(from, subject string, headers map[string]string, body string) bool {
	fromLower := strings.ToLower(from)
	subjectLower := strings.ToLower(subject)
	bodyLower := strings.ToLower(body)

	score := 0

	if headers["X-Spam-Flag"] == "YES" || headers["X-Spam-Status"] != "" {
		score += 5
	}
	if headers["Return-Path"] == "<>" || headers["Return-Path"] == "" {
		score++
	}

	spamTLDs := []string{
		".xyz", ".top", ".club", ".buzz", ".icu",
		".gq", ".cf", ".tk", ".ml", ".ga",
		".wang", ".loan", ".click", ".work",
	}
	for _, tld := range spamTLDs {
		if strings.HasSuffix(fromLower, tld) {
			score += 2
			break
		}
	}

	spamSubjects := []string{
		"you've won", "you have won", "congratulations",
		"claim your", "urgent action", "verify your account",
		"suspended", "confirm your identity",
		"wire transfer", "inheritance", "lottery",
		"million dollars", "click here immediately",
		"act immediately",
	}
	for _, p := range spamSubjects {
		if strings.Contains(subjectLower, p) {
			score += 3
			break
		}
	}

	if len(subject) > 10 {
		caps := 0
		letters := 0
		for _, r := range subject {
			if unicode.IsLetter(r) {
				letters++
				if unicode.IsUpper(r) {
					caps++
				}
			}
		}
		if letters > 0 && float64(caps)/float64(letters) > 0.6 {
			score += 2
		}
	}

	spamBody := []string{
		"click here to claim", "wire transfer",
		"send your bank details", "social security number",
		"you have been selected", "dear beneficiary",
		"confidential business proposal", "act now before",
		"100% free", "risk free", "no obligation",
		"this is not spam", "double your money",
	}
	for _, p := range spamBody {
		if strings.Contains(bodyLower, p) {
			score += 2
		}
	}

	linkCount := strings.Count(bodyLower, "http://") + strings.Count(bodyLower, "https://")
	if linkCount > 10 {
		score += 2
	}

	return score >= 5
}