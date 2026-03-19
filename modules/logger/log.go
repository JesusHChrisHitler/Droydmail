package logger

import (
	"fmt"
	"io"
	"os"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/labstack/gommon/log"
)

type Level int

const (
	DEBUG Level = iota
	INFO
	WARN
	ERROR
)

var levelNames = map[Level]string{
	DEBUG: "DBG",
	INFO:  "INF",
	WARN:  "WRN",
	ERROR: "ERR",
}

var levelColors = map[Level]string{
	DEBUG: "\033[36m",
	INFO:  "\033[32m",
	WARN:  "\033[33m",
	ERROR: "\033[31m",
}

const (
	resetColor  = "\033[0m"
	dimColor    = "\033[2m"
	boldColor   = "\033[1m"
	cyanColor   = "\033[36m"
	magentaColor = "\033[35m"
)

type Logger struct {
	mu       sync.Mutex
	out      io.Writer
	minLevel Level
	color    bool
}

var std = &Logger{
	out:      os.Stdout,
	minLevel: DEBUG,
	color:    true,
}

func SetOutput(w io.Writer)   { std.mu.Lock(); std.out = w; std.mu.Unlock() }
func SetLevel(l Level)        { std.mu.Lock(); std.minLevel = l; std.mu.Unlock() }
func SetColor(enabled bool)   { std.mu.Lock(); std.color = enabled; std.mu.Unlock() }

func Debug(msg string, args ...any) { std.log(DEBUG, msg, args...) }
func Info(msg string, args ...any)  { std.log(INFO, msg, args...) }
func Warn(msg string, args ...any)  { std.log(WARN, msg, args...) }
func Error(msg string, args ...any) { std.log(ERROR, msg, args...) }

type EchoLogger struct{}

func NewEchoLogger() *EchoLogger                             { return &EchoLogger{} }
func (l *EchoLogger) Output() io.Writer                      { return std.out }
func (l *EchoLogger) SetOutput(w io.Writer)                  {}
func (l *EchoLogger) Prefix() string                         { return "" }
func (l *EchoLogger) SetPrefix(p string)                     {}
func (l *EchoLogger) Level() log.Lvl                         { return log.OFF }
func (l *EchoLogger) SetLevel(v log.Lvl)                     {}
func (l *EchoLogger) SetHeader(h string)                     {}
func (l *EchoLogger) Print(i ...interface{})                 {}
func (l *EchoLogger) Printf(format string, args ...interface{}) {}
func (l *EchoLogger) Printj(j log.JSON)                      {}
func (l *EchoLogger) Debug(i ...interface{})                 {}
func (l *EchoLogger) Debugf(format string, args ...interface{}) {}
func (l *EchoLogger) Debugj(j log.JSON)                      {}
func (l *EchoLogger) Info(i ...interface{})                  {}
func (l *EchoLogger) Infof(format string, args ...interface{}) {}
func (l *EchoLogger) Infoj(j log.JSON)                       {}
func (l *EchoLogger) Warn(i ...interface{})                  {}
func (l *EchoLogger) Warnf(format string, args ...interface{}) {}
func (l *EchoLogger) Warnj(j log.JSON)                       {}
func (l *EchoLogger) Error(i ...interface{})                 {}
func (l *EchoLogger) Errorf(format string, args ...interface{}) {}
func (l *EchoLogger) Errorj(j log.JSON)                      {}
func (l *EchoLogger) Fatal(i ...interface{})                 { os.Exit(1) }
func (l *EchoLogger) Fatalj(j log.JSON)                      { os.Exit(1) }
func (l *EchoLogger) Fatalf(format string, args ...interface{}) { os.Exit(1) }
func (l *EchoLogger) Panic(i ...interface{})                 { panic(fmt.Sprint(i...)) }
func (l *EchoLogger) Panicj(j log.JSON)                      { panic(j) }
func (l *EchoLogger) Panicf(format string, args ...interface{}) { panic(fmt.Sprintf(format, args...)) }

func (l *Logger) log(level Level, msg string, args ...any) {
	if level < l.minLevel {
		return
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	ts := time.Now().Format("15:04:05.000")
	caller := getCaller()
	lvl := levelNames[level]

	if l.color {
		fmt.Fprintf(l.out, "%s%s%s %s%s%s %s[%s]%s %s%s%s",
			dimColor, ts, resetColor,
			levelColors[level], lvl, resetColor,
			dimColor, caller, resetColor,
			boldColor, msg, resetColor)
		for i := 0; i < len(args)-1; i += 2 {
			fmt.Fprintf(l.out, " %s%v%s=%s%v%s", cyanColor, args[i], resetColor, magentaColor, args[i+1], resetColor)
		}
	} else {
		fmt.Fprintf(l.out, "%s %s [%s] %s", ts, lvl, caller, msg)
		for i := 0; i < len(args)-1; i += 2 {
			fmt.Fprintf(l.out, " %v=%v", args[i], args[i+1])
		}
	}
	fmt.Fprintln(l.out)
}

func getCaller() string {
	_, file, line, ok := runtime.Caller(3)
	if !ok {
		return "??"
	}
	parts := strings.Split(file, "/")
	if len(parts) > 2 {
		return fmt.Sprintf("%s/%s:%d", parts[len(parts)-2], parts[len(parts)-1], line)
	}
	return fmt.Sprintf("%s:%d", parts[len(parts)-1], line)
}