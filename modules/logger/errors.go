package logger

import "errors"

var (
	ErrLogWriteFailed = errors.New("failed to write log")
)