package proxy

import (
	"encoding/base64"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"georgedroyd.wtf/droydmail/modules/config"
)

type Service struct {
	validator *Validator
	maxSize   int64
	client    *http.Client
}

func NewService(cfg *config.Config) *Service {
	s := &Service{
		validator: NewValidator(cfg.ProxyBlockedHosts, cfg.ProxyBlockedSuffixes, cfg.ProxyAllowedTypes),
		maxSize:   config.ProxyMaxSize,
	}
	s.client = &http.Client{
		Timeout: 10 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 3 {
				return http.ErrUseLastResponse
			}
			if s.validator.IsBlockedHost(req.URL.Hostname()) {
				return http.ErrUseLastResponse
			}
			return nil
		},
	}
	return s
}

func (s *Service) Image(c echo.Context) error {
	encoded := c.QueryParam("url")
	if encoded == "" {
		return c.NoContent(http.StatusBadRequest)
	}
	decoded, err := base64.URLEncoding.DecodeString(encoded)
	if err != nil {
		return c.NoContent(http.StatusBadRequest)
	}
	rawURL := string(decoded)
	if !strings.HasPrefix(rawURL, "http://") && !strings.HasPrefix(rawURL, "https://") {
		return c.NoContent(http.StatusBadRequest)
	}
	if s.validator.IsBlockedURL(rawURL) {
		return c.NoContent(http.StatusForbidden)
	}
	req, err := http.NewRequest("GET", rawURL, nil)
	if err != nil {
		return c.NoContent(http.StatusBadGateway)
	}
	req.Header.Set("User-Agent", "DroydMail/1.0 (Image Proxy)")
	resp, err := s.client.Do(req)
	if err != nil {
		return c.NoContent(http.StatusBadGateway)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return c.NoContent(http.StatusBadGateway)
	}
	contentType := resp.Header.Get("Content-Type")
	if !s.validator.IsAllowedContentType(contentType) {
		return c.NoContent(http.StatusUnsupportedMediaType)
	}
	c.Response().Header().Set("Content-Type", contentType)
	c.Response().Header().Set("Cache-Control", "public, max-age=86400")
	c.Response().WriteHeader(http.StatusOK)
	io.CopyN(c.Response().Writer, resp.Body, s.maxSize)
	return nil
}