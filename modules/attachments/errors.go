package attachments

import "errors"

var (
	ErrInvalidContentType = errors.New("invalid content type")
	ErrFileTooLarge       = errors.New("file too large")
	ErrInvalidFilename    = errors.New("invalid filename")
	ErrNotFound           = errors.New("attachment not found")
	ErrStorageFailed      = errors.New("storage operation failed")
)