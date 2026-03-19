package media

import (
	"os"
	"path/filepath"
	"strings"
	"github.com/labstack/echo/v4"
)

var mediaDir = "assets/media"

func Init(dir string) {
	mediaDir = dir
}

func ServeFile(c echo.Context) error {
	file := c.Param("*")
	cleanPath := filepath.Clean("/" + file)
	path := filepath.Join(mediaDir, cleanPath)
	absBase, _ := filepath.Abs(mediaDir)
	absPath, _ := filepath.Abs(path)
	if !strings.HasPrefix(absPath, absBase) {
		return c.String(403, "forbidden")
	}
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return c.String(404, "not found")
	}
	return c.File(path)
}