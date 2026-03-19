package mail

import (
	"fmt"
	"io"
	"strings"

	"github.com/labstack/echo/v4"

	"georgedroyd.wtf/droydmail/modules/dbutil"
	"georgedroyd.wtf/droydmail/modules/logger"
	"georgedroyd.wtf/droydmail/modules/token"
	"georgedroyd.wtf/droydmail/modules/validation"
)

func (s *Service) List(c echo.Context) error {
	userID := c.Get("userID").(string)
	encKey := c.Get("encryptionKey").(string)

	var req struct {
		Folder    string   `json:"folder"`
		Batch     int      `json:"batch"`
		Size      int      `json:"size"`
		Filter    string   `json:"filter"`
		Recipient []string `json:"recipient"`
	}
	if err := c.Bind(&req); err != nil {
		req.Folder = "inbox"
		req.Batch = 1
		req.Size = 50
	}
	if req.Folder == "" {
		req.Folder = "inbox"
	}
	if err := validation.Folder(req.Folder); err != nil {
		req.Folder = "inbox"
	}
	if req.Batch < 1 {
		req.Batch = 1
	}
	if req.Size < 1 || req.Size > 100 {
		req.Size = 50
	}

	offset := (req.Batch - 1) * req.Size
	emails, err := s.listEmails(userID, req.Folder, encKey, req.Size, offset, req.Filter, req.Recipient)
	if err != nil {
		return c.JSON(500, echo.Map{"error": "failed to list emails"})
	}

	total, _ := s.countEmails(userID, req.Folder, req.Filter, req.Recipient)
	totalBatches := (total + req.Size - 1) / req.Size
	if totalBatches < 1 {
		totalBatches = 1
	}

	result := make([]echo.Map, 0, len(emails))
	for _, e := range emails {
		attachCount := dbutil.CountAttachments(s.db, e.ID)
		result = append(result, echo.Map{
			"token":          e.Token,
			"from":           e.FromAddr,
			"to":             e.ToAddr,
			"subject":        e.Subject,
			"preview":        e.Preview,
			"unread":         e.Unread,
			"isSystem":       e.IsSystem,
			"hasAttachments": attachCount > 0,
			"time":           dbutil.FormatTime(e.CreatedAt),
		})
	}
	return c.JSON(200, echo.Map{
		"emails":       result,
		"batch":        req.Batch,
		"totalBatches": totalBatches,
		"total":        total,
	})
}

func (s *Service) Get(c echo.Context) error {
	userID := c.Get("userID").(string)
	encKey := c.Get("encryptionKey").(string)
	emailToken := c.Param("token")
	if emailToken == "" {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}

	email, err := s.getEmailByToken(userID, emailToken, encKey)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrEmailNotFound.Error()})
	}

	wasUnread := email.Unread
	s.markReadByToken(userID, emailToken)

	if wasUnread {
		s.notifyCountsUpdate(userID)
	}

	attachmentList, _ := s.listAttachments(email.ID, encKey)
	attachmentsData := make([]echo.Map, 0, len(attachmentList))
	for _, a := range attachmentList {
		attachmentsData = append(attachmentsData, echo.Map{
			"token":       a.Token,
			"filename":    a.Filename,
			"contentType": a.ContentType,
			"size":        a.Size,
		})
	}

	return c.JSON(200, echo.Map{
		"token":       email.Token,
		"from":        email.FromAddr,
		"to":          email.ToAddr,
		"cc":          email.CcAddr,
		"subject":     email.Subject,
		"body":        email.Body,
		"bodyHtml":    s.sanitizer.Sanitize(email.BodyHTML),
		"unread":      false,
		"isSystem":    email.IsSystem,
		"time":        dbutil.FormatTime(email.CreatedAt),
		"attachments": attachmentsData,
	})
}

func (s *Service) Send(c echo.Context) error {
	userID := c.Get("userID").(string)
	username := c.Get("username").(string)
	encKey := c.Get("encryptionKey").(string)

	fromParam := validation.Sanitize(c.FormValue("from"))
	to := validation.Sanitize(c.FormValue("to"))
	cc := c.FormValue("cc")
	subject := validation.TrimSpace(c.FormValue("subject"))
	body := c.FormValue("body")

	if err := validation.Email(to, "to"); err != nil {
		return c.JSON(400, echo.Map{"error": err.Message, "field": err.Field})
	}
	if err := validation.Subject(subject); err != nil {
		return c.JSON(400, echo.Map{"error": err.Message, "field": err.Field})
	}
	if err := validation.Body(body); err != nil {
		return c.JSON(400, echo.Map{"error": err.Message, "field": err.Field})
	}

	form, _ := c.MultipartForm()
	var sendAttachments []SendAttachment
	var totalSize int64
	if form != nil && form.File["attachments"] != nil {
		if len(form.File["attachments"]) > s.maxAttachments {
			return c.JSON(400, echo.Map{"error": fmt.Sprintf("Maximum %d attachments allowed", s.maxAttachments)})
		}
		var uploadSize int64
		for _, fh := range form.File["attachments"] {
			uploadSize += fh.Size
		}
		if s.storageChecker != nil {
			canUpload, used, limit := s.storageChecker.CanUpload(userID, uploadSize)
			if !canUpload {
				return c.JSON(400, echo.Map{
					"error": fmt.Sprintf("Storage limit exceeded. Used: %dMB / %dMB", used/1024/1024, limit/1024/1024),
				})
			}
		}
		for _, fh := range form.File["attachments"] {
			if fh.Size > s.maxFileSize {
				return c.JSON(400, echo.Map{"error": fmt.Sprintf("File %s exceeds maximum size of %dMB", fh.Filename, s.maxFileSize/1024/1024)})
			}
			totalSize += fh.Size
			if totalSize > s.maxTotalSize {
				return c.JSON(400, echo.Map{"error": fmt.Sprintf("Total attachment size exceeds %dMB", s.maxTotalSize/1024/1024)})
			}
			file, err := fh.Open()
			if err != nil {
				continue
			}
			data, err := io.ReadAll(file)
			file.Close()
			if err != nil {
				continue
			}
			contentType := fh.Header.Get("Content-Type")
			if contentType == "" {
				contentType = "application/octet-stream"
			}
			if err := validation.ValidateAttachment(data, contentType, fh.Size, s.maxFileSize); err != nil {
				return c.JSON(400, echo.Map{"error": fmt.Sprintf("File %s: %s", fh.Filename, err.Message)})
			}
			sendAttachments = append(sendAttachments, SendAttachment{
				Filename:    validation.Filename(fh.Filename),
				ContentType: contentType,
				Data:        data,
			})
		}
	}

	fromAddr := username + "@" + s.domain
	if fromParam != "" {
		fromLocal := strings.Split(fromParam, "@")[0]
		fromDomain := ""
		if idx := strings.Index(fromParam, "@"); idx != -1 {
			fromDomain = fromParam[idx+1:]
		}
		if fromDomain != s.domain {
			return c.JSON(400, echo.Map{"error": "Invalid from address domain"})
		}
		if fromLocal != username {
			if s.aliasResolver == nil {
				return c.JSON(400, echo.Map{"error": "Invalid from address"})
			}
			aliasUserID, err := s.aliasResolver.GetUserByAlias(fromLocal)
			if err != nil || aliasUserID != userID {
				return c.JSON(400, echo.Map{"error": "Invalid from address - alias not found or not yours"})
			}
		}
		fromAddr = fromParam
	}

	if err := s.sendViaSMTP(fromAddr, to, cc, subject, body, sendAttachments); err != nil {
		logger.Error("smtp send failed", "error", err, "from", fromAddr, "to", to)
		return c.JSON(500, echo.Map{"error": ErrSendFailed.Error()})
	}

	email, err := s.createEmail(userID, "sent", fromAddr, to, cc, subject, body, "", false, encKey)
	if err != nil {
		logger.Error("failed to save sent email", "error", err)
	} else {
		for _, att := range sendAttachments {
			attachToken := token.Generate(24)
			filePath, err := s.storage.Save(email.Token, attachToken, att.Data, encKey)
			if err != nil {
				logger.Error("failed to save sent attachment", "error", err)
				continue
			}
			s.createAttachment(email.ID, attachToken, att.Filename, att.ContentType, int64(len(att.Data)), filePath, encKey)
		}
	}

	if len(sendAttachments) > 0 && s.storageNotifier != nil {
		s.storageNotifier.NotifyStorageChange(userID)
	}
	logger.Info("email sent", "from", fromAddr, "to", to, "attachments", len(sendAttachments))
	return c.JSON(200, echo.Map{"message": "sent"})
}

func (s *Service) Deliver(c echo.Context) error {
	apiKey := c.Request().Header.Get("X-Delivery-Key")
	if apiKey != s.deliveryKey {
		return c.JSON(403, echo.Map{"error": ErrInvalidKey.Error()})
	}

	var req struct {
		From     string `json:"from"`
		To       string `json:"to"`
		Subject  string `json:"subject"`
		Body     string `json:"body"`
		BodyHTML string `json:"bodyHtml"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}

	if validation.ContainsCRLF(req.From) || validation.ContainsCRLF(req.To) || validation.ContainsCRLF(req.Subject) {
		return c.JSON(400, echo.Map{"error": "invalid characters in email headers"})
	}

	toLocal := strings.Split(req.To, "@")[0]
	toLocalNormalized := normalizeLocalPart(toLocal)
	userID, encKey, err := s.getUserByUsername(toLocalNormalized)
	if err != nil {
		if s.aliasResolver != nil {
			aliasUserID, aliasErr := s.aliasResolver.GetUserByAlias(toLocalNormalized)
			if aliasErr == nil {
				userID = aliasUserID
				encKey, err = s.getEncryptionKeyByUserID(userID)
				if err != nil {
					logger.Error("delivery failed: couldn't get enc key for alias", "alias", toLocalNormalized)
					return c.JSON(500, echo.Map{"error": ErrDeliveryFailed.Error()})
				}
			} else {
				logger.Info("delivery rejected: unknown user/alias", "to", req.To)
				return c.JSON(404, echo.Map{"error": ErrUserNotFound.Error()})
			}
		} else {
			logger.Info("delivery rejected: unknown user", "to", req.To)
			return c.JSON(404, echo.Map{"error": ErrUserNotFound.Error()})
		}
	}

	_, err = s.createEmail(userID, "inbox", req.From, req.To, "", req.Subject, req.Body, req.BodyHTML, false, encKey)
	if err != nil {
		logger.Error("delivery failed", "error", err)
		return c.JSON(500, echo.Map{"error": ErrDeliveryFailed.Error()})
	}

	s.notifyCountsUpdate(userID)

	logger.Info("email delivered", "from", req.From, "to", req.To)
	return c.JSON(200, echo.Map{"message": "delivered"})
}

func (s *Service) Delete(c echo.Context) error {
	userID := c.Get("userID").(string)
	emailToken := c.Param("token")
	if emailToken == "" {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}

	s.storage.Delete(emailToken)

	if err := s.deleteEmailByToken(userID, emailToken); err != nil {
		return c.JSON(500, echo.Map{"error": "failed to delete"})
	}

	if s.storageNotifier != nil {
		s.storageNotifier.NotifyStorageChange(userID)
	}
	if s.mailNotifier != nil {
		s.mailNotifier.NotifyMailDelete(userID, emailToken)
	}
	s.notifyCountsUpdate(userID)

	return c.JSON(200, echo.Map{"message": "deleted"})
}

func (s *Service) Move(c echo.Context) error {
	userID := c.Get("userID").(string)
	encKey := c.Get("encryptionKey").(string)
	emailToken := c.Param("token")
	if emailToken == "" {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}

	var req struct {
		Folder string `json:"folder"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}

	if err := validation.Folder(req.Folder); err != nil {
		return c.JSON(400, echo.Map{"error": err.Message, "field": err.Field})
	}

	email, _ := s.getEmailByToken(userID, emailToken, encKey)
	fromFolder := ""
	if email != nil {
		fromFolder = email.Folder
	}

	if err := s.moveEmailByToken(userID, emailToken, req.Folder); err != nil {
		return c.JSON(500, echo.Map{"error": ErrInvalidFolder.Error()})
	}

	if s.mailNotifier != nil && email != nil {
		attachCount := dbutil.CountAttachments(s.db, email.ID)
		s.mailNotifier.NotifyMailMove(userID, emailToken, fromFolder, req.Folder, email.Token, email.FromAddr, email.ToAddr, email.Subject, email.Preview, dbutil.FormatTime(email.CreatedAt), email.Unread, email.IsSystem, attachCount > 0)
	}
	s.notifyCountsUpdate(userID)

	return c.JSON(200, echo.Map{"message": "moved"})
}

func (s *Service) Restore(c echo.Context) error {
	userID := c.Get("userID").(string)
	encKey := c.Get("encryptionKey").(string)
	emailToken := c.Param("token")
	if emailToken == "" {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}

	restoredFolder, err := s.restoreEmailByToken(userID, emailToken)
	if err != nil {
		return c.JSON(500, echo.Map{"error": "failed to restore"})
	}

	if s.mailNotifier != nil {
		email, _ := s.getEmailByToken(userID, emailToken, encKey)
		if email != nil {
			attachCount := dbutil.CountAttachments(s.db, email.ID)
			s.mailNotifier.NotifyMailMove(userID, emailToken, "trash", restoredFolder, email.Token, email.FromAddr, email.ToAddr, email.Subject, email.Preview, dbutil.FormatTime(email.CreatedAt), email.Unread, email.IsSystem, attachCount > 0)
		}
	}
	s.notifyCountsUpdate(userID)

	return c.JSON(200, echo.Map{"message": "restored", "folder": restoredFolder})
}

func (s *Service) GetAttachment(c echo.Context) error {
	userID := c.Get("userID").(string)
	encKey := c.Get("encryptionKey").(string)
	emailToken := c.Param("emailToken")
	attachToken := c.Param("attachToken")

	if emailToken == "" || attachToken == "" {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}

	email, err := s.getEmailByToken(userID, emailToken, encKey)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrEmailNotFound.Error()})
	}

	att, err := s.getAttachmentByToken(attachToken, encKey)
	if err != nil || att.EmailID != email.ID {
		return c.JSON(404, echo.Map{"error": ErrAttachmentNotFound.Error()})
	}

	data, err := s.storage.Load(att.FilePath, encKey)
	if err != nil {
		logger.Error("attachment load failed", "error", err, "token", attachToken)
		return c.JSON(500, echo.Map{"error": "failed to load attachment"})
	}

	c.Response().Header().Set("Content-Disposition", "inline; filename=\""+att.Filename+"\"")
	return c.Blob(200, att.ContentType, data)
}

func (s *Service) GetAttachmentPublic(c echo.Context) error {
	emailToken := c.Param("emailToken")
	attachToken := c.Param("attachToken")

	if emailToken == "" || attachToken == "" {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}

	var emailID int64
	var userID string
	err := s.db.QueryRow(`SELECT id, user_id FROM emails WHERE token = ?`, emailToken).Scan(&emailID, &userID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrEmailNotFound.Error()})
	}

	encKey, err := s.getEncryptionKeyByUserID(userID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": "failed to load attachment"})
	}

	att, err := s.getAttachmentByToken(attachToken, encKey)
	if err != nil || att.EmailID != emailID {
		return c.JSON(404, echo.Map{"error": ErrAttachmentNotFound.Error()})
	}

	data, err := s.storage.Load(att.FilePath, encKey)
	if err != nil {
		logger.Error("attachment load failed", "error", err, "token", attachToken)
		return c.JSON(500, echo.Map{"error": "failed to load attachment"})
	}

	c.Response().Header().Set("Content-Disposition", "inline; filename=\""+att.Filename+"\"")
	c.Response().Header().Set("Cache-Control", "public, max-age=31536000")
	return c.Blob(200, att.ContentType, data)
}