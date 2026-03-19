package admin

import "errors"

var (
	ErrInvalidRequest  = errors.New("invalid request")
	ErrInvalidRole     = errors.New("invalid role")
	ErrUserIDRequired  = errors.New("user_id required")
	ErrUserNotFound    = errors.New("user not found")
	ErrCannotModifySelf = errors.New("cannot modify own role")
	ErrUpdateFailed    = errors.New("failed to update role")
)