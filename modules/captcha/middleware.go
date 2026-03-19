package captcha

import (
	"github.com/labstack/echo/v4"
)

func (s *Service) Middleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		if !s.enabled {
			return next(c)
		}
		token := c.Request().Header.Get("X-Recaptcha-Token")
		if token == "" {
			return c.JSON(400, echo.Map{"error": "captcha required", "code": "CAPTCHA_REQUIRED"})
		}
		if !s.Verify(token) {
			return c.JSON(400, echo.Map{"error": "invalid captcha", "code": "CAPTCHA_INVALID"})
		}
		return next(c)
	}
}