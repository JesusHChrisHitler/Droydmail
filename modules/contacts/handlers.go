package contacts

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"georgedroyd.wtf/droydmail/modules/encryption"
	"georgedroyd.wtf/droydmail/modules/logger"
	"georgedroyd.wtf/droydmail/modules/validation"
)

func (s *Service) List(c echo.Context) error {
	userID := c.Get("userID").(string)
	encKey := c.Get("encryptionKey").(string)
	contacts, err := s.listContacts(userID, encKey)
	if err != nil {
		logger.Error("contacts: list failed", "error", err, "userID", userID)
		return c.JSON(500, echo.Map{"error": "failed to list contacts"})
	}
	if contacts == nil {
		contacts = []Contact{}
	}
	result := make([]echo.Map, len(contacts))
	for i, ct := range contacts {
		avatarURL := ct.AvatarURL
		if avatarURL != "" {
			avatarURL = fmt.Sprintf("/api/contacts/avatar/%s?t=%d", avatarURL, ct.UpdatedAt.Unix())
		}
		result[i] = echo.Map{
			"id":         ct.ID,
			"email":      ct.Email,
			"name":       ct.Name,
			"avatar_url": avatarURL,
			"created_at": ct.CreatedAt,
		}
	}
	return c.JSON(200, result)
}

func (s *Service) Get(c echo.Context) error {
	userID := c.Get("userID").(string)
	encKey := c.Get("encryptionKey").(string)
	contactID := c.Param("id")
	contact, err := s.getContactByID(userID, contactID, encKey)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrNotFound.Error()})
	}
	avatarURL := contact.AvatarURL
	if avatarURL != "" {
		avatarURL = fmt.Sprintf("/api/contacts/avatar/%s?t=%d", avatarURL, contact.UpdatedAt.Unix())
	}
	return c.JSON(200, echo.Map{
		"id":         contact.ID,
		"email":      contact.Email,
		"name":       contact.Name,
		"avatar_url": avatarURL,
		"created_at": contact.CreatedAt,
	})
}

func (s *Service) Create(c echo.Context) error {
	userID := c.Get("userID").(string)
	encKey := c.Get("encryptionKey").(string)
	email := strings.TrimSpace(c.FormValue("email"))
	name := strings.TrimSpace(c.FormValue("name"))

	if err := validateEmail(email); err != nil {
		return c.JSON(400, echo.Map{"error": err.Error()})
	}
	if err := validateName(name); err != nil {
		return c.JSON(400, echo.Map{"error": err.Error()})
	}

	existing, _ := s.getContactByEmail(userID, email, encKey)
	if existing != nil {
		return c.JSON(409, echo.Map{"error": ErrAlreadyExists.Error()})
	}

	avatarURL := ""
	file, err := c.FormFile("avatar")
	if err == nil && file != nil {
		src, err := file.Open()
		if err != nil {
			return c.JSON(500, echo.Map{"error": "failed to read avatar"})
		}
		defer src.Close()
		data, _ := io.ReadAll(src)

		ext := strings.ToLower(filepath.Ext(file.Filename))
		if err := validation.ValidateImageUpload(data, ext, file.Size, s.maxAvatarSize); err != nil {
			return c.JSON(400, echo.Map{"error": err.Message})
		}
		if s.storageChecker != nil {
			if canUpload, _, _ := s.storageChecker.CanUpload(userID, int64(len(data))); !canUpload {
				return c.JSON(400, echo.Map{"error": "storage limit exceeded"})
			}
		}

		contact, err := s.createContact(userID, email, name, "", encKey)
		if err != nil {
			return c.JSON(500, echo.Map{"error": "failed to create contact"})
		}

		url, err := s.saveAvatar(userID, contact.ID, data, ext, encKey)
		if err != nil {
			s.deleteContact(userID, contact.ID)
			return c.JSON(500, echo.Map{"error": "failed to save avatar"})
		}
		s.updateContact(userID, contact.ID, name, url, encKey)
		s.notifyStorage(userID)
		s.notifyContacts(userID)

		return c.JSON(201, echo.Map{
			"id":         contact.ID,
			"email":      email,
			"name":       name,
			"avatar_url": fmt.Sprintf("/api/contacts/avatar/%s?t=%d", url, time.Now().Unix()),
		})
	}

	contact, err := s.createContact(userID, email, name, avatarURL, encKey)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			return c.JSON(409, echo.Map{"error": ErrAlreadyExists.Error()})
		}
		return c.JSON(500, echo.Map{"error": "failed to create contact"})
	}

	s.notifyContacts(userID)

	return c.JSON(201, echo.Map{
		"id":         contact.ID,
		"email":      email,
		"name":       name,
		"avatar_url": avatarURL,
	})
}

func (s *Service) Update(c echo.Context) error {
	userID := c.Get("userID").(string)
	encKey := c.Get("encryptionKey").(string)
	contactID := c.Param("id")

	contact, err := s.getContactByID(userID, contactID, encKey)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrNotFound.Error()})
	}

	name := strings.TrimSpace(c.FormValue("name"))
	if name == "" {
		name = contact.Name
	}
	if err := validateName(name); err != nil {
		return c.JSON(400, echo.Map{"error": err.Error()})
	}

	avatarURL := contact.AvatarURL
	file, err := c.FormFile("avatar")
	if err == nil && file != nil {
		src, err := file.Open()
		if err != nil {
			return c.JSON(500, echo.Map{"error": "failed to read avatar"})
		}
		defer src.Close()
		data, _ := io.ReadAll(src)

		ext := strings.ToLower(filepath.Ext(file.Filename))
		if err := validation.ValidateImageUpload(data, ext, file.Size, s.maxAvatarSize); err != nil {
			return c.JSON(400, echo.Map{"error": err.Message})
		}
		if s.storageChecker != nil {
			if canUpload, _, _ := s.storageChecker.CanUpload(userID, int64(len(data))); !canUpload {
				return c.JSON(400, echo.Map{"error": "storage limit exceeded"})
			}
		}

		s.deleteAvatar(userID, contact.AvatarURL)
		url, err := s.saveAvatar(userID, contactID, data, ext, encKey)
		if err != nil {
			return c.JSON(500, echo.Map{"error": "failed to save avatar"})
		}
		avatarURL = url
		s.notifyStorage(userID)
	}

	if err := s.updateContact(userID, contactID, name, avatarURL, encKey); err != nil {
		return c.JSON(500, echo.Map{"error": "failed to update contact"})
	}

	s.notifyContacts(userID)

	responseAvatarURL := avatarURL
	if responseAvatarURL != "" {
		responseAvatarURL = fmt.Sprintf("/api/contacts/avatar/%s?t=%d", responseAvatarURL, time.Now().Unix())
	}
	return c.JSON(200, echo.Map{
		"id":         contactID,
		"email":      contact.Email,
		"name":       name,
		"avatar_url": responseAvatarURL,
	})
}

func (s *Service) Delete(c echo.Context) error {
	userID := c.Get("userID").(string)
	encKey := c.Get("encryptionKey").(string)
	contactID := c.Param("id")

	contact, err := s.getContactByID(userID, contactID, encKey)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrNotFound.Error()})
	}

	s.deleteAvatar(userID, contact.AvatarURL)
	if err := s.deleteContact(userID, contactID); err != nil {
		return c.JSON(500, echo.Map{"error": "failed to delete contact"})
	}

	s.notifyContacts(userID)

	return c.JSON(200, echo.Map{"message": "contact deleted"})
}

func (s *Service) ServeAvatar(c echo.Context) error {
	userID := c.Get("userID").(string)
	encKey := c.Get("encryptionKey").(string)
	filename := c.Param("filename")
	filePath := filepath.Join(s.storageDir, userID, filename)
	encData, err := os.ReadFile(filePath)
	if err != nil {
		return c.JSON(404, echo.Map{"error": "avatar not found"})
	}
	data, err := encryption.DecryptBytes(encData, encKey)
	if err != nil {
		logger.Error("contacts: avatar decrypt failed", "error", err)
		return c.JSON(500, echo.Map{"error": "failed to load avatar"})
	}
	return c.Blob(200, "image/jpeg", data)
}