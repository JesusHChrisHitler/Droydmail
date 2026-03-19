// New file - modules/admin/handlers.go
package admin

import (
	"github.com/labstack/echo/v4"
)

func (s *Service) ListUsers(c echo.Context) error {
	users, err := s.listUsers()
	if err != nil {
		return c.JSON(500, echo.Map{"error": "failed to list users"})
	}
	if users == nil {
		users = []UserInfo{}
	}
	return c.JSON(200, echo.Map{"users": users, "total": len(users)})
}

func (s *Service) SetRole(c echo.Context) error {
	currentUserID := c.Get("userID").(string)
	var req struct {
		UserID string `json:"user_id"`
		Role   string `json:"role"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	if req.Role != "user" && req.Role != "admin" {
		return c.JSON(400, echo.Map{"error": ErrInvalidRole.Error()})
	}
	if req.UserID == "" {
		return c.JSON(400, echo.Map{"error": ErrUserIDRequired.Error()})
	}
	if req.UserID == currentUserID {
		return c.JSON(403, echo.Map{"error": ErrCannotModifySelf.Error()})
	}
	rows, err := s.updateRole(req.UserID, req.Role)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrUpdateFailed.Error()})
	}
	if rows == 0 {
		return c.JSON(404, echo.Map{"error": ErrUserNotFound.Error()})
	}
	if s.notifier != nil {
		s.notifier.NotifyRoleChange(req.UserID, req.Role)
	}
	return c.JSON(200, echo.Map{"message": "role updated", "user_id": req.UserID, "role": req.Role})
}

func (s *Service) GetUser(c echo.Context) error {
	userID := c.Param("id")
	if userID == "" {
		return c.JSON(400, echo.Map{"error": ErrUserIDRequired.Error()})
	}
	user, err := s.getUser(userID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrUserNotFound.Error()})
	}
	return c.JSON(200, user)
}

func (s *Service) ListReports(c echo.Context) error {
	limit := 50
	offset := 0
	reports, total, err := s.listReports(limit, offset)
	if err != nil {
		return c.JSON(500, echo.Map{"error": "failed to list reports"})
	}
	if reports == nil {
		reports = []ReportEmail{}
	}
	return c.JSON(200, echo.Map{"reports": reports, "total": total})
}

func (s *Service) GetReport(c echo.Context) error {
	token := c.Param("token")
	if token == "" {
		return c.JSON(400, echo.Map{"error": "token required"})
	}
	report, err := s.getReport(token)
	if err != nil {
		return c.JSON(404, echo.Map{"error": "report not found"})
	}
	userID := c.Get("userID").(string)
	s.NotifyAdminCounts(userID)
	return c.JSON(200, report)
}

func (s *Service) DeleteReport(c echo.Context) error {
	token := c.Param("token")
	if token == "" {
		return c.JSON(400, echo.Map{"error": "token required"})
	}
	if err := s.deleteReport(token); err != nil {
		return c.JSON(500, echo.Map{"error": "failed to delete report"})
	}
	return c.JSON(200, echo.Map{"message": "report deleted"})
}

func (s *Service) BulkDeleteReports(c echo.Context) error {
	var req struct {
		Tokens []string `json:"tokens"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": "invalid request"})
	}
	if len(req.Tokens) == 0 {
		return c.JSON(400, echo.Map{"error": "no tokens provided"})
	}
	if err := s.bulkDeleteReports(req.Tokens); err != nil {
		return c.JSON(500, echo.Map{"error": "failed to delete reports"})
	}
	return c.JSON(200, echo.Map{"message": "reports deleted", "count": len(req.Tokens)})
}