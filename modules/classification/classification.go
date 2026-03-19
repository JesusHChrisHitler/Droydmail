package classification

type ContactChecker interface {
	IsContact(userID, email string) bool
}

type Classifier struct {
	contactChecker ContactChecker
}

func New() *Classifier {
	return &Classifier{}
}

func (c *Classifier) SetContactChecker(cc ContactChecker) {
	c.contactChecker = cc
}

func (c *Classifier) Classify(from, subject string, headers map[string]string, body, userID string) string {
	if c.contactChecker != nil && c.contactChecker.IsContact(userID, from) {
		return "inbox"
	}

	if isSpam(from, subject, headers, body) {
		return "spam"
	}

	if isCodes(from, subject, headers, body) {
		return "codes"
	}

	if isPromotion(from, subject, headers, body) {
		return "promotions"
	}

	return "inbox"
}