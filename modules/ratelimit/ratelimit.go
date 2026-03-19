package ratelimit

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/labstack/echo/v4"
)

type RuleConfig struct {
	PathPrefix string
	Rate       float64
	Burst      int
	Period     time.Duration
}

type Config struct {
	DefaultRate   float64
	DefaultBurst  int
	DefaultPeriod time.Duration
	Rules         []RuleConfig
	CleanupPeriod time.Duration
}

type bucket struct {
	tokens     float64
	lastUpdate time.Time
	rate       float64
	burst      int
}

type Limiter struct {
	config  Config
	buckets map[string]*bucket
	mu      sync.RWMutex
	stop    chan struct{}
}

func New(cfg Config) *Limiter {
	if cfg.CleanupPeriod == 0 {
		cfg.CleanupPeriod = 5 * time.Minute
	}
	l := &Limiter{
		config:  cfg,
		buckets: make(map[string]*bucket),
		stop:    make(chan struct{}),
	}
	go l.cleanup()
	return l
}

func (l *Limiter) Stop() {
	close(l.stop)
}

func (l *Limiter) getRule(path string) (float64, int) {
	for _, rule := range l.config.Rules {
		if strings.HasPrefix(path, rule.PathPrefix) {
			rate := rule.Rate
			if rule.Period > 0 {
				rate = rule.Rate / rule.Period.Seconds()
			}
			return rate, rule.Burst
		}
	}
	rate := l.config.DefaultRate
	if l.config.DefaultPeriod > 0 {
		rate = l.config.DefaultRate / l.config.DefaultPeriod.Seconds()
	}
	return rate, l.config.DefaultBurst
}

func (l *Limiter) Allow(ip, path string) bool {
	rate, burst := l.getRule(path)
	key := ip + ":" + l.getPathKey(path)

	l.mu.Lock()
	defer l.mu.Unlock()

	b, exists := l.buckets[key]
	now := time.Now()

	if !exists {
		l.buckets[key] = &bucket{
			tokens:     float64(burst) - 1,
			lastUpdate: now,
			rate:       rate,
			burst:      burst,
		}
		return true
	}

	elapsed := now.Sub(b.lastUpdate).Seconds()
	b.tokens += elapsed * b.rate
	if b.tokens > float64(b.burst) {
		b.tokens = float64(b.burst)
	}
	b.lastUpdate = now

	if b.tokens >= 1 {
		b.tokens--
		return true
	}
	return false
}

func (l *Limiter) getPathKey(path string) string {
	for _, rule := range l.config.Rules {
		if strings.HasPrefix(path, rule.PathPrefix) {
			return rule.PathPrefix
		}
	}
	return "default"
}

func (l *Limiter) cleanup() {
	ticker := time.NewTicker(l.config.CleanupPeriod)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			l.mu.Lock()
			cutoff := time.Now().Add(-l.config.CleanupPeriod)
			for key, b := range l.buckets {
				if b.lastUpdate.Before(cutoff) {
					delete(l.buckets, key)
				}
			}
			l.mu.Unlock()
		case <-l.stop:
			return
		}
	}
}

func (l *Limiter) Middleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			ip := c.RealIP()
			path := c.Request().URL.Path

			if !l.Allow(ip, path) {
				return c.JSON(http.StatusTooManyRequests, echo.Map{
					"error": "rate limit exceeded, please slow down",
				})
			}
			return next(c)
		}
	}
}