package classification

import "strings"

func isPromotion(from, subject string, headers map[string]string, body string) bool {
	fromLower := strings.ToLower(from)
	subjectLower := strings.ToLower(subject)
	bodyLower := strings.ToLower(body)

	if headers["List-Unsubscribe"] != "" {
		return true
	}
	if headers["Precedence"] == "bulk" || headers["Precedence"] == "list" {
		return true
	}
	if headers["X-Mailer"] != "" || headers["X-Campaign"] != "" || headers["X-Campaign-ID"] != "" {
		return true
	}
	if strings.Contains(headers["X-Auto-Response-Suppress"], "OOF") {
		return true
	}

	promoSenders := []string{
		"newsletter", "noreply", "no-reply", "marketing",
		"promo", "updates@", "news@", "offers@", "deals@",
		"info@", "notifications@", "digest@", "announce@",
		"campaign", "bulk@", "mailer@", "subscribe",
	}
	for _, p := range promoSenders {
		if strings.Contains(fromLower, p) {
			return true
		}
	}

	promoSubjects := []string{
		"% off", "sale", "limited time", "act now",
		"exclusive offer", "free shipping", "discount",
		"weekly digest", "monthly newsletter", "your weekly",
		"don't miss", "last chance",
	}
	for _, p := range promoSubjects {
		if strings.Contains(subjectLower, p) {
			return true
		}
	}

	promoBody := []string{
		"unsubscribe", "manage preferences", "opt out",
		"you're receiving this email because",
		"view in browser", "view this email in",
		"email preferences", "update your preferences",
	}
	for _, p := range promoBody {
		if strings.Contains(bodyLower, p) {
			return true
		}
	}

	return false
}