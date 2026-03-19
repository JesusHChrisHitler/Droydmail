package mail

import (
	"bytes"
	"encoding/base64"
	"io"
	"mime"
	"mime/multipart"
	"mime/quotedprintable"
	"net/mail"
	"strings"

	"github.com/emersion/go-smtp"

	"georgedroyd.wtf/droydmail/modules/logger"
	"georgedroyd.wtf/droydmail/modules/dbutil"
	"georgedroyd.wtf/droydmail/modules/token"
	"georgedroyd.wtf/droydmail/modules/validation"
)

type smtpBackend struct {
	svc *Service
}

func (s *Service) StartSMTPServer(addr string) error {
	be := &smtpBackend{svc: s}
	srv := smtp.NewServer(be)
	srv.Addr = addr
	srv.Domain = s.domain
	srv.AllowInsecureAuth = true

	logger.Info("smtp server starting", "addr", addr)
	return srv.ListenAndServe()
}

func (be *smtpBackend) NewSession(_ *smtp.Conn) (smtp.Session, error) {
	return &smtpSession{be: be}, nil
}

type smtpSession struct {
	be   *smtpBackend
	from string
	to   []string
}

func (s *smtpSession) AuthPlain(username, password string) error {
	return nil
}

func (s *smtpSession) Mail(from string, opts *smtp.MailOptions) error {
	s.from = from
	return nil
}

func (s *smtpSession) Rcpt(to string, opts *smtp.RcptOptions) error {
	s.to = append(s.to, to)
	return nil
}

func (s *smtpSession) Data(r io.Reader) error {
	var buf bytes.Buffer
	if _, err := buf.ReadFrom(r); err != nil {
		return err
	}

	raw := buf.String()
	subject, body, bodyHTML, parsedAttachments, headers := parseEmail(raw)

	for _, to := range s.to {
		local := strings.Split(to, "@")[0]
		localNormalized := normalizeLocalPart(local)
		if localNormalized == "admin" {
			fromDomain := ""
			if idx := strings.LastIndex(s.from, "@"); idx != -1 {
				fromDomain = s.from[idx+1:]
			}
			if fromDomain != s.be.svc.domain {
				logger.Info("smtp: admin report rejected - external sender", "from", s.from)
				continue
			}
			reportToken := token.Generate(24)
			preview := body
			if len(preview) > 100 {
				preview = preview[:100]
			}
			_, err := s.be.svc.db.Exec(`
				INSERT INTO report_emails (token, from_addr, to_addr, subject, body, body_html, preview)
				VALUES (?, ?, ?, ?, ?, ?, ?)
			`, reportToken, s.from, to, subject, body, bodyHTML, preview)
			if err != nil {
				logger.Error("smtp: report delivery failed", "error", err)
			} else {
				logger.Info("smtp: report delivered", "from", s.from, "to", to)
				if s.be.svc.notifier != nil {
					s.be.svc.notifier.NotifyAdminReport(reportToken, s.from, subject, preview)
				}
			}
			continue
		}
		userID, encKey, err := s.be.svc.getUserByUsername(localNormalized)
		if err != nil {
			if s.be.svc.aliasResolver != nil {
				aliasUserID, aliasErr := s.be.svc.aliasResolver.GetUserByAlias(localNormalized)
				if aliasErr == nil {
					userID = aliasUserID
					encKey, err = s.be.svc.getEncryptionKeyByUserID(userID)
					if err != nil {
						logger.Error("smtp: couldn't get enc key for alias", "alias", localNormalized)
						continue
					}
				} else {
					logger.Info("smtp: unknown recipient", "to", to)
					continue
				}
			} else {
				logger.Info("smtp: unknown recipient", "to", to)
				continue
			}
		}

		folder := "inbox"
		if s.be.svc.classifier != nil {
			folder = s.be.svc.classifier.Classify(s.from, subject, headers, body, userID)
		}
		cc := headers["Cc"]
		email, err := s.be.svc.createEmail(userID, folder, s.from, to, cc, subject, body, bodyHTML, false, encKey)
		if err != nil {
			logger.Error("smtp: delivery failed", "error", err)
			continue
		}
		if s.be.svc.notifier != nil {
			s.be.svc.notifier.NotifyEmail(userID, email.Token, s.from, to, subject, email.Preview, folder, dbutil.FormatTime(email.CreatedAt), true, false, len(parsedAttachments) > 0)
			counts, _ := s.be.svc.getUnreadCounts(userID)
			s.be.svc.notifier.NotifyUnreadCounts(userID, counts)
		}

		savedCount := 0
		for _, att := range parsedAttachments {
			if err := validation.ContentType(att.ContentType); err != nil {
				logger.Warn("smtp: attachment rejected", "filename", att.Filename, "contentType", att.ContentType, "error", err)
				continue
			}
			if err := validation.FileSize(int64(len(att.Data)), 25*1024*1024); err != nil {
				logger.Warn("smtp: attachment too large", "filename", att.Filename, "size", len(att.Data))
				continue
			}
			if !validation.MagicBytes(att.Data, att.ContentType) {
				logger.Warn("smtp: attachment magic bytes mismatch", "filename", att.Filename, "contentType", att.ContentType)
				continue
			}

			safeFilename := validation.Filename(att.Filename)
			attachToken := token.Generate(24)

			filePath, err := s.be.svc.storage.Save(email.Token, attachToken, att.Data, encKey)
			if err != nil {
				logger.Error("smtp: attachment storage failed", "error", err, "filename", safeFilename)
				continue
			}

			_, err = s.be.svc.createAttachment(email.ID, attachToken, safeFilename, att.ContentType, int64(len(att.Data)), filePath, encKey)
			if err != nil {
				logger.Error("smtp: attachment db failed", "error", err, "filename", safeFilename)
				continue
			}
			savedCount++
			logger.Info("smtp: attachment saved", "filename", safeFilename, "size", len(att.Data), "contentType", att.ContentType)
		}

		logger.Info("smtp: delivered", "from", s.from, "to", to, "attachments", savedCount)
	}
	return nil
}

func (s *smtpSession) Reset() {
	s.from = ""
	s.to = nil
}

func (s *smtpSession) Logout() error {
	return nil
}

type ParsedAttachment struct {
	Filename    string
	ContentType string
	Data        []byte
}

func parseEmail(raw string) (subject, body, bodyHTML string, attachments []ParsedAttachment, headers map[string]string) {
	headers = make(map[string]string)
	raw = strings.ReplaceAll(raw, "\r\n", "\n")
	msg, err := mail.ReadMessage(strings.NewReader(strings.ReplaceAll(raw, "\n", "\r\n")))
	if err != nil {
		subject = parseHeaderSimple(raw, "Subject")
		body = parseBodySimple(raw)
		return
	}

	subject = decodeHeader(msg.Header.Get("Subject"))
	contentType := msg.Header.Get("Content-Type")
	transferEncoding := msg.Header.Get("Content-Transfer-Encoding")
	
	for key := range msg.Header {
		headers[key] = msg.Header.Get(key)
	}

	if contentType == "" {
		bodyBytes, _ := io.ReadAll(msg.Body)
		body = decodeBody(string(bodyBytes), transferEncoding)
		return
	}

	mediaType, params, err := mime.ParseMediaType(contentType)
	if err != nil {
		bodyBytes, _ := io.ReadAll(msg.Body)
		body = strings.TrimSpace(string(bodyBytes))
		return
	}

	if strings.HasPrefix(mediaType, "multipart/") {
		body, bodyHTML, attachments = parseMultipart(msg.Body, params["boundary"])
	} else if mediaType == "text/html" {
		bodyBytes, _ := io.ReadAll(msg.Body)
		bodyHTML = decodeBody(string(bodyBytes), transferEncoding)
		body = stripHTML(bodyHTML)
	} else {
		bodyBytes, _ := io.ReadAll(msg.Body)
		body = decodeBody(string(bodyBytes), transferEncoding)
	}

	return
}

func parseMultipart(r io.Reader, boundary string) (text, html string, attachments []ParsedAttachment) {
	mr := multipart.NewReader(r, boundary)
	for {
		part, err := mr.NextPart()
		if err != nil {
			break
		}

		contentType := part.Header.Get("Content-Type")
		transferEncoding := part.Header.Get("Content-Transfer-Encoding")
		contentDisposition := part.Header.Get("Content-Disposition")
		partBytes, _ := io.ReadAll(part)

		mediaType, params, _ := mime.ParseMediaType(contentType)

		isAttachment := strings.Contains(contentDisposition, "attachment") ||
			(strings.Contains(contentDisposition, "inline") && !strings.HasPrefix(mediaType, "text/")) ||
			strings.HasPrefix(mediaType, "image/") ||
			strings.HasPrefix(mediaType, "application/")

		if strings.HasPrefix(mediaType, "multipart/") {
			nestedText, nestedHTML, nestedAttachments := parseMultipart(strings.NewReader(string(partBytes)), params["boundary"])
			if text == "" {
				text = nestedText
			}
			if html == "" {
				html = nestedHTML
			}
			attachments = append(attachments, nestedAttachments...)
		} else if isAttachment {
			filename := params["name"]
			if filename == "" {
				_, dispParams, _ := mime.ParseMediaType(contentDisposition)
				filename = dispParams["filename"]
			}
			if filename == "" {
				filename = "attachment"
			}

			var data []byte
			switch strings.ToLower(transferEncoding) {
			case "base64":
				cleaned := strings.Map(func(r rune) rune {
					if r == ' ' || r == '\n' || r == '\r' || r == '\t' {
						return -1
					}
					return r
				}, string(partBytes))
				decoded, err := base64.StdEncoding.DecodeString(cleaned)
				if err == nil && len(decoded) > 0 {
					data = decoded
				} else {
					data = partBytes
				}
			case "quoted-printable":
				decoded, err := io.ReadAll(quotedprintable.NewReader(bytes.NewReader(partBytes)))
				if err == nil {
					data = decoded
				} else {
					data = partBytes
				}
			default:
				data = partBytes
			}

			attachments = append(attachments, ParsedAttachment{
				Filename:    filename,
				ContentType: mediaType,
				Data:        data,
			})
		} else if mediaType == "text/plain" && text == "" {
			text = decodeBody(string(partBytes), transferEncoding)
		} else if mediaType == "text/html" && html == "" {
			html = decodeBody(string(partBytes), transferEncoding)
		}
	}
	if text == "" && html != "" {
		text = stripHTML(html)
	}
	return
}

func decodeBody(content, encoding string) string {
	encoding = strings.ToLower(strings.TrimSpace(encoding))
	switch encoding {
	case "base64":
		cleaned := strings.Map(func(r rune) rune {
			if r == ' ' || r == '\n' || r == '\r' || r == '\t' {
				return -1
			}
			return r
		}, content)
		decoded, err := base64.StdEncoding.DecodeString(cleaned)
		if err != nil {
			return strings.TrimSpace(content)
		}
		return strings.TrimSpace(string(decoded))
	case "quoted-printable":
		decoded, err := io.ReadAll(quotedprintable.NewReader(strings.NewReader(content)))
		if err != nil {
			return strings.TrimSpace(content)
		}
		return strings.TrimSpace(string(decoded))
	default:
		return strings.TrimSpace(content)
	}
}

func decodeHeader(header string) string {
	dec := new(mime.WordDecoder)
	decoded, err := dec.DecodeHeader(header)
	if err != nil {
		return header
	}
	return decoded
}

func stripHTML(html string) string {
	result := strings.ReplaceAll(html, "<br>", "\n")
	result = strings.ReplaceAll(result, "<br/>", "\n")
	result = strings.ReplaceAll(result, "<br />", "\n")
	result = strings.ReplaceAll(result, "</p>", "\n")
	result = strings.ReplaceAll(result, "</div>", "\n")

	var text strings.Builder
	inTag := false
	for _, r := range result {
		if r == '<' {
			inTag = true
		} else if r == '>' {
			inTag = false
		} else if !inTag {
			text.WriteRune(r)
		}
	}
	return strings.TrimSpace(text.String())
}

func parseHeaderSimple(raw, name string) string {
	for _, line := range strings.Split(raw, "\n") {
		if strings.HasPrefix(strings.ToLower(line), strings.ToLower(name)+":") {
			return strings.TrimSpace(strings.TrimPrefix(line, name+":"))
		}
	}
	return ""
}

func parseBodySimple(raw string) string {
	parts := strings.SplitN(raw, "\n\n", 2)
	if len(parts) == 2 {
		return strings.TrimSpace(parts[1])
	}
	return ""
}