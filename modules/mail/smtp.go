package mail

import (
	"encoding/base64"
	"fmt"
	"net/smtp"
	"strings"
)

type SendAttachment struct {
	Filename    string
	ContentType string
	Data        []byte
}

func (s *Service) sendViaSMTP(from, to, cc, subject, body string, attachments []SendAttachment) error {
	msg := strings.Builder{}
	msg.WriteString(fmt.Sprintf("From: %s\r\n", from))
	msg.WriteString(fmt.Sprintf("To: %s\r\n", to))
	if cc != "" {
		msg.WriteString(fmt.Sprintf("Cc: %s\r\n", cc))
	}
	msg.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	msg.WriteString("MIME-Version: 1.0\r\n")

	if len(attachments) == 0 {
		msg.WriteString("Content-Type: text/plain; charset=\"utf-8\"\r\n")
		msg.WriteString("\r\n")
		msg.WriteString(body)
	} else {
		boundary := "----=_Part_0_" + fmt.Sprintf("%d", len(body)+len(attachments))
		msg.WriteString(fmt.Sprintf("Content-Type: multipart/mixed; boundary=\"%s\"\r\n", boundary))
		msg.WriteString("\r\n")

		msg.WriteString(fmt.Sprintf("--%s\r\n", boundary))
		msg.WriteString("Content-Type: text/plain; charset=\"utf-8\"\r\n")
		msg.WriteString("Content-Transfer-Encoding: 7bit\r\n")
		msg.WriteString("\r\n")
		msg.WriteString(body)
		msg.WriteString("\r\n")

		for _, att := range attachments {
			msg.WriteString(fmt.Sprintf("--%s\r\n", boundary))
			msg.WriteString(fmt.Sprintf("Content-Type: %s; name=\"%s\"\r\n", att.ContentType, att.Filename))
			msg.WriteString("Content-Transfer-Encoding: base64\r\n")
			msg.WriteString(fmt.Sprintf("Content-Disposition: attachment; filename=\"%s\"\r\n", att.Filename))
			msg.WriteString("\r\n")

			encoded := base64.StdEncoding.EncodeToString(att.Data)
			for i := 0; i < len(encoded); i += 76 {
				end := i + 76
				if end > len(encoded) {
					end = len(encoded)
				}
				msg.WriteString(encoded[i:end])
				msg.WriteString("\r\n")
			}
		}

		msg.WriteString(fmt.Sprintf("--%s--\r\n", boundary))
	}

	recipients := []string{to}
	if cc != "" {
		for _, addr := range strings.Split(cc, ",") {
			if trimmed := strings.TrimSpace(addr); trimmed != "" {
				recipients = append(recipients, trimmed)
			}
		}
	}
	return smtp.SendMail(s.smtpRelay, nil, from, recipients, []byte(msg.String()))
}

func (s *Service) sendHTMLViaSMTP(from, to, subject, textBody, htmlBody string) error {
	boundary := "----=_Part_" + fmt.Sprintf("%d", len(textBody)+len(htmlBody))
	msg := strings.Builder{}
	msg.WriteString(fmt.Sprintf("From: %s\r\n", from))
	msg.WriteString(fmt.Sprintf("To: %s\r\n", to))
	msg.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	msg.WriteString("MIME-Version: 1.0\r\n")
	msg.WriteString(fmt.Sprintf("Content-Type: multipart/alternative; boundary=\"%s\"\r\n", boundary))
	msg.WriteString("\r\n")
	msg.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	msg.WriteString("Content-Type: text/plain; charset=\"utf-8\"\r\n")
	msg.WriteString("\r\n")
	msg.WriteString(textBody)
	msg.WriteString("\r\n")
	msg.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	msg.WriteString("Content-Type: text/html; charset=\"utf-8\"\r\n")
	msg.WriteString("\r\n")
	msg.WriteString(htmlBody)
	msg.WriteString("\r\n")
	msg.WriteString(fmt.Sprintf("--%s--\r\n", boundary))
	return smtp.SendMail(s.smtpRelay, nil, from, []string{to}, []byte(msg.String()))
}