package contacts

import "errors"

var (
	ErrNotFound       = errors.New("contact not found")
	ErrAlreadyExists  = errors.New("contact already exists")
	ErrInvalidEmail   = errors.New("invalid email address")
	ErrInvalidName    = errors.New("invalid name")
	ErrStorageFailed  = errors.New("failed to store avatar")
)