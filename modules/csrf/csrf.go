package csrf

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"georgedroyd.wtf/droydmail/modules/token"
)

const (
	CookieName = "csrf_token"
	HeaderName = "X-CSRF-Token"
)

type Service struct {
	secure   bool
	sameSite http.SameSite
}

func NewService(secure bool) *Service {
	sameSite := http.SameSiteLaxMode
	if secure {
		sameSite = http.SameSiteStrictMode
	}
	return &Service{secure: secure, sameSite: sameSite}
}

func (s *Service) EnsureToken(c echo.Context) string {
	cookie, err := c.Cookie(CookieName)
	if err == nil && cookie.Value != "" {
		return cookie.Value
	}
	csrfToken := token.GenerateBase64(32)
	c.SetCookie(&http.Cookie{
		Name:     CookieName,
		Value:    csrfToken,
		Path:     "/",
		MaxAge:   86400,
		HttpOnly: false,
		Secure:   s.secure,
		SameSite: s.sameSite,
	})
	return csrfToken
}

func (s *Service) Validate(c echo.Context) bool {
	cookie, err := c.Cookie(CookieName)
	if err != nil || cookie.Value == "" {
		return false
	}
	header := c.Request().Header.Get(HeaderName)
	return header != "" && header == cookie.Value
}