package aliases

import "errors"

var (
	ErrMaxAliases = errors.New("maximum aliases reached")
	ErrAliasTaken = errors.New("alias already taken")
	ErrNotFound   = errors.New("alias not found")
)

type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}