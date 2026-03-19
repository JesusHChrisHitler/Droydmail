package drafts

import "errors"

var (
	ErrDraftNotFound  = errors.New("draft not found")
	ErrInvalidRequest = errors.New("invalid request")
)