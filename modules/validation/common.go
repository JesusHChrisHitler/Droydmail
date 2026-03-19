package validation

import "strings"

type Error struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

func Sanitize(s string) string {
	return strings.TrimSpace(strings.ToLower(s))
}

func TrimSpace(s string) string {
	return strings.TrimSpace(s)
}

func ContainsCRLF(s string) bool {
	return strings.ContainsAny(s, "\r\n")
}