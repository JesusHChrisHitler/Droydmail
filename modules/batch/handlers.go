package batch

import (
	"github.com/labstack/echo/v4"
	"georgedroyd.wtf/droydmail/modules/dbutil"
	"georgedroyd.wtf/droydmail/modules/validation"
)

func (s *Service) Move(c echo.Context) error {
	userID := c.Get("userID").(string)
	encKey := c.Get("encryptionKey").(string)
	var req struct {
		Tokens []string `json:"tokens"`
		Folder string   `json:"folder"`
	}
	if err := c.Bind(&req); err != nil || len(req.Tokens) == 0 {
		return c.JSON(400, echo.Map{"error": "invalid request"})
	}
	if err := validation.Folder(req.Folder); err != nil {
		return c.JSON(400, echo.Map{"error": err.Message})
	}
	if len(req.Tokens) > 100 {
		return c.JSON(400, echo.Map{"error": "max 100 emails per batch"})
	}
	emails, _ := s.getEmailsByTokens(userID, req.Tokens, encKey)
	count, err := s.batchMove(userID, req.Tokens, req.Folder)
	if err != nil {
		return c.JSON(500, echo.Map{"error": "batch move failed"})
	}
	if s.mailNotifier != nil {
		for _, token := range req.Tokens {
			if email := emails[token]; email != nil {
				attachCount := dbutil.CountAttachments(s.db, email.ID)
				s.mailNotifier.NotifyMailMove(userID, token, email.Folder, req.Folder, email.Token, email.FromAddr, email.ToAddr, email.Subject, email.Preview, dbutil.FormatTime(email.CreatedAt), email.Unread, email.IsSystem, attachCount > 0)
			}
		}
	}
	s.notifyCountsUpdate(userID)
	return c.JSON(200, echo.Map{"moved": count})
}

func (s *Service) Delete(c echo.Context) error {
	userID := c.Get("userID").(string)
	var req struct {
		Tokens []string `json:"tokens"`
	}
	if err := c.Bind(&req); err != nil || len(req.Tokens) == 0 {
		return c.JSON(400, echo.Map{"error": "invalid request"})
	}
	if len(req.Tokens) > 100 {
		return c.JSON(400, echo.Map{"error": "max 100 emails per batch"})
	}
	for _, token := range req.Tokens {
		s.storage.Delete(token)
	}
	count, err := s.batchDelete(userID, req.Tokens)
	if err != nil {
		return c.JSON(500, echo.Map{"error": "batch delete failed"})
	}
	if s.storageNotifier != nil {
		s.storageNotifier.NotifyStorageChange(userID)
	}
	if s.mailNotifier != nil {
		s.mailNotifier.NotifyBatchDelete(userID, req.Tokens)
	}
	s.notifyCountsUpdate(userID)
	return c.JSON(200, echo.Map{"deleted": count})
}

func (s *Service) Restore(c echo.Context) error {
	userID := c.Get("userID").(string)
	var req struct {
		Tokens []string `json:"tokens"`
	}
	if err := c.Bind(&req); err != nil || len(req.Tokens) == 0 {
		return c.JSON(400, echo.Map{"error": "invalid request"})
	}
	if len(req.Tokens) > 100 {
		return c.JSON(400, echo.Map{"error": "max 100 emails per batch"})
	}
	count, err := s.batchRestore(userID, req.Tokens)
	if err != nil {
		return c.JSON(500, echo.Map{"error": "batch restore failed"})
	}
	s.notifyCountsUpdate(userID)
	return c.JSON(200, echo.Map{"restored": count})
}