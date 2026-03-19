package config

var defaultReservedUsernames = []string{
	"admin", "root", "system", "postmaster", "webmaster",
	"mail", "support", "help", "info", "noreply", "no-reply",
	"abuse", "security", "hostmaster", "www", "ftp",
	"smtp", "imap", "pop", "api", "verification",
}

var defaultBlockedEmailDomains = []string{
	"tempmail.com",
	"throwaway.email",
	"mailinator.com",
	"guerrillamail.com",
	"10minutemail.com",
	"fakeinbox.com",
}

var defaultProxyBlockedHosts = []string{
	"localhost",
	"127.0.0.1",
	"0.0.0",
	"[::1]",
	"::1",
	"metadata.google.internal",
}

var defaultProxyBlockedSuffixes = []string{
	".local",
	".internal",
	".localhost",
	".nip.io",
	".xip.io",
	".sslip.io",
	".localtest.me",
}

var defaultProxyAllowedTypes = []string{
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
}