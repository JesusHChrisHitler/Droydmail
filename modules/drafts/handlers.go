package drafts

import (
	"github.com/labstack/echo/v4"

	"georgedroyd.wtf/droydmail/modules/dbutil"
)

func (s *Service) List(c echo.Context) error {
	userID := c.Get("userID").(string)
	encKey := c.Get("encryptionKey").(string)

	drafts, err := s.listDrafts(userID, encKey)
	if err != nil {
		return c.JSON(500, echo.Map{"error": "failed to list drafts"})
	}

	result := make([]echo.Map, 0, len(drafts))
	for _, d := range drafts {
		result = append(result, echo.Map{
			"token":   d.Token,
			"from":    d.FromAddr,
			"to":      d.ToAddr,
			"cc":      d.CcAddr,
			"subject": d.Subject,
			"body":    d.Body,
			"time":    dbutil.FormatTime(d.UpdatedAt),
		})
	}

	return c.JSON(200, echo.Map{"drafts": result, "total": len(result)})
}

func (s *Service) Get(c echo.Context) error {
	userID := c.Get("userID").(string)
	encKey := c.Get("encryptionKey").(string)
	draftToken := c.Param("token")
	if draftToken == "" {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}

	draft, err := s.getDraft(userID, draftToken, encKey)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrDraftNotFound.Error()})
	}

	return c.JSON(200, echo.Map{
		"token":   draft.Token,
		"from":    draft.FromAddr,
		"to":      draft.ToAddr,
		"cc":      draft.CcAddr,
		"subject": draft.Subject,
		"body":    draft.Body,
		"time":    dbutil.FormatTime(draft.UpdatedAt),
	})
}

func (s *Service) Save(c echo.Context) error {
	userID := c.Get("userID").(string)
	encKey := c.Get("encryptionKey").(string)

	var req struct {
		Token   string `json:"token"`
		From    string `json:"from"`
		To      string `json:"to"`
		Cc      string `json:"cc"`
		Subject string `json:"subject"`
		Body    string `json:"body"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}

	draft, err := s.saveDraft(userID, req.Token, req.From, req.To, req.Cc, req.Subject, req.Body, encKey)
	if err != nil {
		return c.JSON(500, echo.Map{"error": "failed to save draft"})
	}

	return c.JSON(200, echo.Map{
		"token":   draft.Token,
		"message": "saved",
	})
}

func (s *Service) Delete(c echo.Context) error {
	userID := c.Get("userID").(string)
	draftToken := c.Param("token")
	if draftToken == "" {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}

	if err := s.deleteDraft(userID, draftToken); err != nil {
		return c.JSON(500, echo.Map{"error": "failed to delete draft"})
	}

	return c.JSON(200, echo.Map{"message": "deleted"})
}