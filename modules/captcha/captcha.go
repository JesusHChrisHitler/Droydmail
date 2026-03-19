package captcha

import (
	"encoding/json"
	"net/http"
	"net/url"
	"time"
)

type Service struct {
	enabled   bool
	siteKey   string
	secretKey string
	client    *http.Client
}

type verifyResponse struct {
	Success     bool     `json:"success"`
	ChallengeTS string   `json:"challenge_ts"`
	Hostname    string   `json:"hostname"`
	ErrorCodes  []string `json:"error-codes"`
}

func NewService(enabled bool, siteKey, secretKey string) *Service {
	return &Service{
		enabled:   enabled,
		siteKey:   siteKey,
		secretKey: secretKey,
		client:    &http.Client{Timeout: 10 * time.Second},
	}
}

func (s *Service) IsEnabled() bool {
	return s.enabled
}

func (s *Service) GetSiteKey() string {
	return s.siteKey
}

func (s *Service) Verify(token string) bool {
	if !s.enabled {
		return true
	}
	if token == "" {
		return false
	}
	resp, err := s.client.PostForm("https://www.google.com/recaptcha/api/siteverify", url.Values{
		"secret":   {s.secretKey},
		"response": {token},
	})
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	var result verifyResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return false
	}
	return result.Success
}