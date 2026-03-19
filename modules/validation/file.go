package validation

import (
	"path/filepath"
	"strings"
)

var AllowedContentTypes = map[string]bool{
	"image/jpeg": true, "image/png": true, "image/gif": true, "image/webp": true,
	"image/svg+xml": true, "application/pdf": true, "application/zip": true,
	"application/x-zip-compressed": true, "application/msword": true,
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
	"application/vnd.ms-excel": true,
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": true,
	"text/plain": true, "text/csv": true, "application/json": true,
	"application/octet-stream": true,
}

var AllowedImageExts = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true,
}

var FileMagicBytes = map[string][]byte{
	"image/jpeg":      {0xFF, 0xD8, 0xFF},
	"image/png":       {0x89, 0x50, 0x4E, 0x47},
	"image/gif":       {0x47, 0x49, 0x46},
	"image/webp":      {0x52, 0x49, 0x46, 0x46},
	"application/pdf": {0x25, 0x50, 0x44, 0x46},
	"application/zip": {0x50, 0x4B, 0x03, 0x04},
}

func ContentType(contentType string) *Error {
	ct := strings.ToLower(strings.Split(contentType, ";")[0])
	if !AllowedContentTypes[ct] {
		return &Error{Field: "contentType", Message: "File type not allowed"}
	}
	return nil
}

func FileSize(size, maxSize int64) *Error {
	if size > maxSize {
		return &Error{Field: "file", Message: "File too large"}
	}
	return nil
}

func MagicBytes(data []byte, contentType string) bool {
	magic, ok := FileMagicBytes[contentType]
	if !ok {
		return true
	}
	if len(data) < len(magic) {
		return false
	}
	for i, b := range magic {
		if data[i] != b {
			return false
		}
	}
	return true
}

func ValidateImageUpload(data []byte, ext string, size, maxSize int64) *Error {
	ext = strings.ToLower(ext)
	if !AllowedImageExts[ext] {
		return &Error{Field: "file", Message: "invalid image format"}
	}
	if err := FileSize(size, maxSize); err != nil {
		return err
	}
	contentType := "image/" + strings.TrimPrefix(ext, ".")
	if ext == ".jpg" {
		contentType = "image/jpeg"
	}
	if !MagicBytes(data, contentType) {
		return &Error{Field: "file", Message: "file content does not match image type"}
	}
	return nil
}

func ValidateAttachment(data []byte, contentType string, size, maxSize int64) *Error {
	if err := ContentType(contentType); err != nil {
		return err
	}
	if err := FileSize(size, maxSize); err != nil {
		return err
	}
	return nil
}

func Filename(filename string) string {
	filename = filepath.Base(filename)
	ext := filepath.Ext(filename)
	name := strings.TrimSuffix(filename, ext)
	name = strings.ReplaceAll(name, ".", "")
	var safe strings.Builder
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			safe.WriteRune(r)
		}
	}
	result := safe.String()
	if result == "" {
		result = "file"
	}
	return result + strings.ToLower(ext)
}