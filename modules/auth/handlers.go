package auth

import (
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"
	"georgedroyd.wtf/droydmail/modules/validation"

	"georgedroyd.wtf/droydmail/modules/encryption"
)

func (s *Service) Register(c echo.Context) error {
	username, _ := c.Get("verified_username").(string)
	passwordHash, _ := c.Get("verified_password_hash").(string)
	ip, _ := c.Get("verified_ip").(string)
	recoveryEmail, _ := c.Get("verified_email").(string)

	if username == "" || passwordHash == "" || recoveryEmail == "" {
		return c.JSON(400, echo.Map{"error": "verification required"})
	}

	encKey := encryption.GenerateKey()

	encryptedKey, err := encryption.EncryptUserKey(encKey, s.masterKey)
	if err != nil {
		return c.JSON(500, echo.Map{"error": "server error"})
	}

	user, err := s.createUser(username, passwordHash, encryptedKey, recoveryEmail, ip, "user")
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			return c.JSON(409, echo.Map{"error": ErrUsernameTaken.Error()})
		}
		return c.JSON(500, echo.Map{"error": "server error"})
	}

	s.setSession(c, user.ID)
	if s.welcomeSender != nil {
		s.welcomeSender.SendWelcomeEmail(user.ID, user.Username)
	}
	return c.JSON(201, echo.Map{
		"id":       user.ID,
		"username": user.Username,
		"email":    user.Username + "@" + s.domain,
	})
}

func (s *Service) Login(c echo.Context) error {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": "invalid request"})
	}

	req.Username = validation.Sanitize(req.Username)
	user, err := s.getUserByUsername(req.Username)
	if err != nil {
		return c.JSON(401, echo.Map{"error": ErrInvalidCredentials.Error()})
	}

	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
		return c.JSON(401, echo.Map{"error": ErrInvalidCredentials.Error()})
	}

	s.updateLastLoginIP(user.ID, c.RealIP())
	s.setSession(c, user.ID)

	return c.JSON(200, echo.Map{
		"id":             user.ID,
		"username":       user.Username,
		"email":          user.Username + "@" + s.domain,
		"recovery_email": user.RecoveryEmail,
		"role":           user.Role,
	})
}

func (s *Service) Logout(c echo.Context) error {
	cookie, _ := c.Cookie(SessionCookieName)
	if cookie != nil {
		s.deleteSession(cookie.Value)
	}
	c.SetCookie(&http.Cookie{
		Name:   SessionCookieName,
		Value:  "",
		Path:   "/",
		MaxAge: -1,
	})
	return c.JSON(200, echo.Map{"message": "logged out"})
}

func (s *Service) Me(c echo.Context) error {
	userID := c.Get("userID").(string)
	user, err := s.getUserByID(userID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrUserNotFound.Error()})
	}
	response := echo.Map{
		"id":             user.ID,
		"username":       user.Username,
		"email":          user.Username + "@" + s.domain,
		"recovery_email": user.RecoveryEmail,
		"role":           user.Role,
	}
	if s.storageGetter != nil {
		used, limit, percent := s.storageGetter.GetUsage(userID)
		response["storage"] = echo.Map{
			"used":    used,
			"limit":   limit,
			"percent": percent,
		}
	}
	return c.JSON(200, response)
}
func (s *Service) ListSessions(c echo.Context) error {
	userID := c.Get("userID").(string)
	currentSession, _ := c.Cookie(SessionCookieName)
	sessions, err := s.getUserSessions(userID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": "server error"})
	}
	result := make([]echo.Map, len(sessions))
	for i, sess := range sessions {
		result[i] = echo.Map{
			"id":         sess.ID[:8] + "...",
			"ip":         sess.IP,
			"user_agent": sess.UserAgent,
			"expires_at": sess.ExpiresAt,
			"created_at": sess.CreatedAt,
			"current":    currentSession != nil && currentSession.Value == sess.ID,
		}
	}
	return c.JSON(200, result)
}

func (s *Service) RevokeSession(c echo.Context) error {
	userID := c.Get("userID").(string)
	sessionID := c.Param("id")
	currentSession, _ := c.Cookie(SessionCookieName)
	
	sessions, _ := s.getUserSessions(userID)
	var targetSession *Session
	for _, sess := range sessions {
		if sess.ID[:8]+"..." == sessionID {
			targetSession = &sess
			break
		}
	}
	if targetSession == nil {
		return c.JSON(404, echo.Map{"error": "session not found"})
	}
	if currentSession != nil && currentSession.Value == targetSession.ID {
		return c.JSON(400, echo.Map{"error": "cannot revoke current session"})
	}
	s.deleteSession(targetSession.ID)
	return c.JSON(200, echo.Map{"message": "session revoked"})
}