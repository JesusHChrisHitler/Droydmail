package verification

import (
	"strings"

	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"

	"georgedroyd.wtf/droydmail/modules/logger"
	"georgedroyd.wtf/droydmail/modules/token"
	"georgedroyd.wtf/droydmail/modules/validation"
)

func (s *Service) StartVerification(c echo.Context) error {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
		Email    string `json:"email"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": "invalid request"})
	}

	req.Username = validation.Sanitize(req.Username)
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	if err := validation.Username(req.Username, s.reserved); err != nil {
		return c.JSON(400, echo.Map{"error": err.Message, "field": err.Field})
	}
	if err := validation.Password(req.Password); err != nil {
		return c.JSON(400, echo.Map{"error": err.Message, "field": err.Field})
	}
	if err := validation.RecoveryEmail(req.Email, s.domain, s.blockedDomains); err != nil {
		return c.JSON(400, echo.Map{"error": err.Message, "field": err.Field})
	}

	if s.identity.NameTaken(req.Username) {
		return c.JSON(409, echo.Map{"error": "username already taken", "field": "username"})
	}
	if s.identity.EmailTaken(req.Email) {
		return c.JSON(409, echo.Map{"error": "email already in use", "field": "email"})
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	code := token.GenerateNumeric(6)

	_, err := s.createPending(req.Username, string(hash), req.Email, code, c.RealIP())
	if err != nil {
		logger.Error("failed to create pending verification", "error", err, "username", req.Username)
		return c.JSON(500, echo.Map{"error": "server error"})
	}

	if s.sender != nil {
		if err := s.sender.SendVerificationEmail(req.Email, code); err != nil {
			logger.Error("failed to send verification email", "error", err, "email", req.Email)
			return c.JSON(500, echo.Map{"error": "failed to send verification email"})
		}
	}

	return c.JSON(200, echo.Map{"message": "verification code sent"})
}

type UserCreator interface {
	Register(c echo.Context) error
}

func (s *Service) VerifyAndRegister(authSvc UserCreator) echo.HandlerFunc {
	return func(c echo.Context) error {
		var req struct {
			Username string `json:"username"`
			Code     string `json:"code"`
		}
		if err := c.Bind(&req); err != nil {
			return c.JSON(400, echo.Map{"error": "invalid request"})
		}

		req.Username = validation.Sanitize(req.Username)
		req.Code = strings.TrimSpace(req.Code)

		pending, err := s.getPendingByUsername(req.Username)
		if err != nil {
			return c.JSON(400, echo.Map{"error": "no pending verification or expired"})
		}

		if pending.Code != req.Code {
			return c.JSON(400, echo.Map{"error": "invalid code", "field": "code"})
		}

		if s.identity.NameTaken(pending.Username) {
			s.deletePending(pending.ID)
			return c.JSON(409, echo.Map{"error": "username already taken", "field": "username"})
		}
		if s.identity.EmailTaken(pending.RecoveryEmail) {
			s.deletePending(pending.ID)
			return c.JSON(409, echo.Map{"error": "email already in use", "field": "email"})
		}

		s.deletePending(pending.ID)

		c.Set("verified_username", pending.Username)
		c.Set("verified_password_hash", pending.PasswordHash)
		c.Set("verified_ip", c.RealIP())
		c.Set("verified_email", pending.RecoveryEmail)

		return authSvc.Register(c)
	}
}