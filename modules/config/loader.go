package config

import (
	"os"

	"georgedroyd.wtf/droydmail/modules/token"
)

func Load() *Config {
	masterKey := os.Getenv("DROYD_MASTER_KEY")
	if masterKey == "" {
		panic("DROYD_MASTER_KEY environment variable is required")
	}
	if len(masterKey) < 32 {
		panic("DROYD_MASTER_KEY must be at least 32 characters")
	}

	return &Config{
		DBPath:      getEnv("DROYD_DB_DSN", "droydmail.db"),
		Domain:      getEnv("DROYD_DOMAIN", "georgedroyd.wtf"),
		HTTPAddr:    getEnv("DROYD_HTTP_ADDR", ":8080"),
		SMTPAddr:    getEnv("DROYD_SMTP_ADDR", ":2525"),
		SMTPRelay:   getEnv("DROYD_SMTP_RELAY", "127.0.0.1:25"),
		Secure:      getEnv("DROYD_SECURE", "false") == "true",
		MasterKey:   masterKey,
		DeliveryKey: getEnv("DROYD_DELIVERY_KEY", token.GenerateHex(16)),

		MediaDir:   getEnv("DROYD_MEDIA_DIR", "assets/media"),
		AssetsDir:  getEnv("DROYD_ASSETS_DIR", "assets/public"),
		StorageDir: getEnv("DROYD_STORAGE_DIR", "storage/attachments"),

		MaxFileSize:    getEnvInt64("DROYD_MAX_FILE_SIZE", 25*1024*1024),
		MaxAttachments: getEnvInt("DROYD_MAX_ATTACHMENTS", 5),
		MaxTotalSize:   getEnvInt64("DROYD_MAX_TOTAL_SIZE", 50*1024*1024),
		MaxBodySize:    getEnv("DROYD_MAX_BODY_SIZE", "60M"),

		ReservedUsernames:    getEnvList("DROYD_RESERVED_USERNAMES", defaultReservedUsernames),
		BlockedEmailDomains:  getEnvList("DROYD_BLOCKED_EMAIL_DOMAINS", defaultBlockedEmailDomains),
		ProxyBlockedHosts:    getEnvList("DROYD_PROXY_BLOCKED_HOSTS", defaultProxyBlockedHosts),
		ProxyBlockedSuffixes: getEnvList("DROYD_PROXY_BLOCKED_SUFFIXES", defaultProxyBlockedSuffixes),
		ProxyAllowedTypes:    getEnvList("DROYD_PROXY_ALLOWED_TYPES", defaultProxyAllowedTypes),

		RateLimitEnabled:   getEnv("DROYD_RATE_LIMIT_ENABLED", "true") == "true",
		RateLimitDefault:   getEnvInt("DROYD_RATE_LIMIT_DEFAULT", 100),
		RateLimitBurst:     getEnvInt("DROYD_RATE_LIMIT_BURST", 20),
		RateLimitAuth:      getEnvInt("DROYD_RATE_LIMIT_AUTH", 10),
		RateLimitAuthBurst: getEnvInt("DROYD_RATE_LIMIT_AUTH_BURST", 5),

		VerificationExpiry: getEnvInt("DROYD_VERIFICATION_EXPIRY", 15),
		MaxStorage:         getEnvInt64("DROYD_MAX_STORAGE", 100*1024*1024),
		MaxAvatarSize:      getEnvInt64("DROYD_MAX_AVATAR_SIZE", 2*1024*1024),
		MaxAliases:         getEnvInt("DROYD_MAX_ALIASES", 50),

		CaptchaEnabled:     getEnv("DROYD_CAPTCHA_ENABLED", "true") == "true",
		RecaptchaSiteKey:   getEnv("DROYD_RECAPTCHA_SITE_KEY", ""),
		RecaptchaSecretKey: getEnv("DROYD_RECAPTCHA_SECRET_KEY", ""),

		WSWriteWait:       getEnvInt("DROYD_WS_WRITE_WAIT", 10),
		WSPongWait:        getEnvInt("DROYD_WS_PONG_WAIT", 60),
		WSMaxMessageSize:  getEnvInt64("DROYD_WS_MAX_MESSAGE_SIZE", 512),
		WSReadBufferSize:  getEnvInt("DROYD_WS_READ_BUFFER_SIZE", 1024),
		WSWriteBufferSize: getEnvInt("DROYD_WS_WRITE_BUFFER_SIZE", 1024),
		WSMaxConnsPerUser: getEnvInt("DROYD_WS_MAX_CONNS_PER_USER", 5),
		WSAllowedOrigins:  getEnvList("DROYD_WS_ALLOWED_ORIGINS", []string{getEnv("DROYD_DOMAIN", "georgedroyd.wtf")}),
	}
}