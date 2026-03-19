package auth

import "errors"

var (
	ErrUserNotFound      = errors.New("user not found")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUsernameTaken     = errors.New("username already taken")
	ErrUsernameInvalid   = errors.New("username must be 3-32 characters")
	ErrPasswordTooShort  = errors.New("password must be at least 8 characters")
	ErrSessionExpired    = errors.New("session expired")
	ErrUnauthorized      = errors.New("unauthorized")
	ErrInvalidCSRF       = errors.New("invalid csrf token")
)