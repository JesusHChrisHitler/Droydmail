package roles

import (
	"github.com/labstack/echo/v4"
)

func (s *Service) SetRole(c echo.Context) error {
	var req struct {
		UserID string `json:"user_id"`
		Role   string `json:"role"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": "invalid request"})
	}
	if !Valid(req.Role) {
		return c.JSON(400, echo.Map{"error": "invalid role"})
	}
	if req.UserID == "" {
		return c.JSON(400, echo.Map{"error": "user_id required"})
	}
	rows, err := s.updateRole(req.UserID, req.Role)
	if err != nil {
		return c.JSON(500, echo.Map{"error": "failed to update role"})
	}
	if rows == 0 {
		return c.JSON(404, echo.Map{"error": "user not found"})
	}
	return c.JSON(200, echo.Map{"message": "role updated", "user_id": req.UserID, "role": req.Role})
}