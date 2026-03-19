package mail

import "errors"

var (
	ErrEmailNotFound      = errors.New("email not found")
	ErrUserNotFound       = errors.New("recipient user not found")
	ErrInvalidFolder      = errors.New("invalid folder")
	ErrSendFailed         = errors.New("failed to send email")
	ErrDeliveryFailed     = errors.New("failed to deliver email")
	ErrInvalidRequest     = errors.New("invalid request")
	ErrMissingFields      = errors.New("all fields are required")
	ErrInvalidKey         = errors.New("invalid delivery key")
	ErrAttachmentNotFound = errors.New("attachment not found")
)	