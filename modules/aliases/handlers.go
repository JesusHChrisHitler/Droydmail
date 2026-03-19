package aliases

import (
	"github.com/labstack/echo/v4"
)

func (s *Service) List(c echo.Context) error {
	userID := c.Get("userID").(string)
	aliases, err := s.listAliases(userID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": "failed to list aliases"})
	}
	if aliases == nil {
		aliases = []Alias{}
	}

	result := make([]echo.Map, len(aliases))
	for i, a := range aliases {
		result[i] = echo.Map{
			"id":         a.ID,
			"alias":      a.Alias,
			"email":      a.Alias + "@" + s.domain,
			"created_at": a.CreatedAt,
		}
	}
	return c.JSON(200, echo.Map{
		"aliases": result,
		"limit":   s.maxAliases,
	})
}

func (s *Service) Create(c echo.Context) error {
	userID := c.Get("userID").(string)

	var req struct {
		Alias string `json:"alias"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": "invalid request"})
	}

	alias, err := s.createAlias(userID, req.Alias)
	if err != nil {
		return c.JSON(400, echo.Map{"error": err.Error()})
	}

	email := alias.Alias + "@" + s.domain
	if s.notifier != nil {
		s.notifier.NotifyAliasCreate(userID, alias.ID, alias.Alias, email, alias.CreatedAt.Format("2006-01-02T15:04:05Z"))
	}

	return c.JSON(201, echo.Map{
		"id":         alias.ID,
		"alias":      alias.Alias,
		"email":      email,
		"created_at": alias.CreatedAt,
	})
}

func (s *Service) Delete(c echo.Context) error {
	userID := c.Get("userID").(string)
	aliasID := c.Param("id")

	alias, err := s.getAliasById(userID, aliasID)
	if err != nil {
		if err == ErrNotFound {
			return c.JSON(404, echo.Map{"error": "alias not found"})
		}
		return c.JSON(500, echo.Map{"error": "failed to get alias"})
	}

	if err := s.deleteAlias(userID, aliasID); err != nil {
		return c.JSON(500, echo.Map{"error": "failed to delete alias"})
	}

	if s.notifier != nil {
		s.notifier.NotifyAliasDelete(userID, aliasID, alias.Alias+"@"+s.domain)
	}

	return c.JSON(200, echo.Map{"message": "alias deleted"})
}	