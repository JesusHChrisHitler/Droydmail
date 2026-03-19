package auth

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"

	"georgedroyd.wtf/droydmail/modules/csrf"
	"georgedroyd.wtf/droydmail/modules/token"
)

const (
	SessionCookieName = "session"
	SessionDuration   = 7 * 24 * time.Hour
	BcryptCost        = 12
)

type WelcomeEmailSender interface {
	SendWelcomeEmail(userID string, username string) error
}

type StorageGetter interface {
	GetUsage(userID string) (used, limit int64, percent float64)
}

type Service struct {
	db                *sql.DB
	domain            string
	masterKey         string
	secure            bool
	sameSite          http.SameSite
	csrf              *csrf.Service
	welcomeSender     WelcomeEmailSender
	storageGetter     StorageGetter
	reservedUsernames []string
}

func NewService(db *sql.DB, domain string, masterKey string, secure bool, csrfSvc *csrf.Service, reservedUsernames []string) *Service {
	sameSite := http.SameSiteLaxMode
	if secure {
		sameSite = http.SameSiteStrictMode
	}
	return &Service{db: db, domain: domain, masterKey: masterKey, secure: secure, sameSite: sameSite, csrf: csrfSvc, welcomeSender: nil, reservedUsernames: reservedUsernames}
}

func (s *Service) SetWelcomeSender(sender WelcomeEmailSender) {
	s.welcomeSender = sender
}

func (s *Service) SetStorageGetter(sg StorageGetter) {
	s.storageGetter = sg
}

func (s *Service) setSession(c echo.Context, userID string) {
	sessionToken := token.GenerateBase64(32)
	expiresAt := time.Now().Add(SessionDuration)
	s.createSession(userID, sessionToken, c.RealIP(), c.Request().UserAgent(), expiresAt)

	c.SetCookie(&http.Cookie{
		Name:     SessionCookieName,
		Value:    sessionToken,
		Path:     "/",
		Expires:  expiresAt,
		MaxAge:   int(SessionDuration.Seconds()),
		HttpOnly: true,
		Secure:   s.secure,
		SameSite: s.sameSite,
	})
}

func (s *Service) GetUserID(c echo.Context) (string, bool) {
	cookie, err := c.Cookie(SessionCookieName)
	if err != nil || cookie.Value == "" {
		return "", false
	}
	sess, err := s.getSession(cookie.Value)
	if err != nil {
		return "", false
	}
	return sess.UserID, true
}

func (s *Service) RequireAuth(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		userID, ok := s.GetUserID(c)
		if !ok {
			return c.JSON(401, echo.Map{"error": "unauthorized"})
		}
		user, err := s.getUserByID(userID)
		if err != nil {
			return c.JSON(401, echo.Map{"error": "unauthorized"})
		}
		c.Set("userID", userID)
		c.Set("username", user.Username)
		c.Set("encryptionKey", user.EncryptionKey)
		c.Set("role", user.Role)
		return next(c)
	}
}

func (s *Service) RequireAdmin(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		role, _ := c.Get("role").(string)
		if role != "admin" {
			return c.JSON(403, echo.Map{"error": "forbidden"})
		}
		return next(c)
	}
}

func (s *Service) UsernameExists(username string) bool {
	_, err := s.getUserByUsername(username)
	return err == nil
}