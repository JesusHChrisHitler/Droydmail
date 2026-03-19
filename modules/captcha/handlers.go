package captcha

import (
	"github.com/labstack/echo/v4"
)

func (s *Service) HandleGetConfig(c echo.Context) error {
	return c.JSON(200, echo.Map{
		"enabled": s.enabled,
		"siteKey": s.siteKey,
	})
}