package main

import (
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	_ "modernc.org/sqlite"
	"georgedroyd.wtf/droydmail/modules/aliases"
	"georgedroyd.wtf/droydmail/modules/identity"
	"georgedroyd.wtf/droydmail/modules/auth"
	"georgedroyd.wtf/droydmail/modules/config"
	"georgedroyd.wtf/droydmail/modules/csrf"
	"georgedroyd.wtf/droydmail/modules/logger"
	"georgedroyd.wtf/droydmail/modules/mail"
	"georgedroyd.wtf/droydmail/modules/media"
	"georgedroyd.wtf/droydmail/modules/websocket"
	"georgedroyd.wtf/droydmail/modules/ratelimit"
	"georgedroyd.wtf/droydmail/modules/captcha"
	"georgedroyd.wtf/droydmail/modules/contacts"
	"georgedroyd.wtf/droydmail/modules/storage"
	"georgedroyd.wtf/droydmail/modules/proxy"
	"georgedroyd.wtf/droydmail/modules/router"
	"georgedroyd.wtf/droydmail/modules/verification"
	"georgedroyd.wtf/droydmail/modules/search"
	"georgedroyd.wtf/droydmail/modules/batch"
	"georgedroyd.wtf/droydmail/modules/admin"
	"georgedroyd.wtf/droydmail/modules/classification"
	"georgedroyd.wtf/droydmail/modules/drafts"
)

func main() {
	cfg := config.Load()
	logger.Info("delivery key configured", "length", len(cfg.DeliveryKey))
	db, err := sql.Open("sqlite", cfg.DBPath)
	if err != nil {
		panic(err)
	}
	defer db.Close()
	if err := auth.Migrate(db); err != nil {
		panic(err)
	}
	if err := mail.Migrate(db); err != nil {
		panic(err)
	}
	if err := verification.Migrate(db); err != nil {
		panic(err)
	}
	if err := contacts.Migrate(db); err != nil {
		panic(err)
	}
	if err := aliases.Migrate(db); err != nil {
		panic(err)
	}
	if err := drafts.Migrate(db); err != nil {
		panic(err)
	}
	csrfSvc := csrf.NewService(cfg.Secure)
	storage.Init(cfg.StorageDir)
	storageSvc := storage.NewService(db, cfg.MaxStorage)
	captchaSvc := captcha.NewService(cfg.CaptchaEnabled, cfg.RecaptchaSiteKey, cfg.RecaptchaSecretKey)
	authSvc := auth.NewService(db, cfg.Domain, cfg.MasterKey, cfg.Secure, csrfSvc, cfg.ReservedUsernames)
	mailSvc := mail.NewService(db, cfg.Domain, cfg.MasterKey, cfg.DeliveryKey, cfg.SMTPRelay, cfg.StorageDir, cfg.MaxFileSize, cfg.MaxTotalSize, cfg.MaxAttachments, csrfSvc)
	identityChecker := identity.NewChecker(db, cfg.MasterKey)
	verifySvc := verification.NewService(db, cfg.Domain, cfg.MasterKey, cfg.VerificationExpiry, cfg.ReservedUsernames, cfg.BlockedEmailDomains, identityChecker)
	verifySvc.SetEmailSender(mailSvc)
	media.Init(cfg.MediaDir)
	contactsSvc := contacts.NewService(db, cfg.StorageDir, cfg.MaxAvatarSize)
	aliasesSvc := aliases.NewService(db, cfg.Domain, cfg.MasterKey, cfg.ReservedUsernames, cfg.MaxAliases, identityChecker)
	draftsSvc := drafts.NewService(db, cfg.MasterKey)
	searchSvc := search.NewService(db, cfg.MasterKey)
	batchSvc := batch.NewService(db, cfg.MasterKey, cfg.StorageDir)
	adminSvc := admin.NewService(db, cfg.MasterKey, cfg.Domain, nil)
	wsHub := websocket.NewHub(&websocket.Config{
		WriteWait:       time.Duration(cfg.WSWriteWait) * time.Second,
		PongWait:        time.Duration(cfg.WSPongWait) * time.Second,
		PingPeriod:      time.Duration(cfg.WSPongWait*9/10) * time.Second,
		MaxMessageSize:  cfg.WSMaxMessageSize,
		MaxConnsPerUser: cfg.WSMaxConnsPerUser,
	})
	wsHub.SetSearcher(searchSvc)
	wsHub.SetCountsProvider(mailSvc)
	wsHub.SetAdminCountsProvider(adminSvc)
	classifierSvc := classification.New()
	mailSvc.SetClassifier(classifierSvc)
	mailSvc.SetNotifier(wsHub)
	mailSvc.SetStorageChecker(storageSvc)
	mailSvc.SetStorageNotifier(storageSvc)
	mailSvc.SetMailNotifier(wsHub)
	contactsSvc.SetStorageChecker(storageSvc)
	contactsSvc.SetStorageNotifier(storageSvc)
	mailSvc.SetAliasResolver(aliasesSvc)
	storageSvc.SetNotifier(wsHub)
	contactsSvc.SetContactsNotifier(wsHub)
	aliasesSvc.SetNotifier(wsHub)
	batchSvc.SetNotifier(wsHub)
	batchSvc.SetMailNotifier(wsHub)
	batchSvc.SetStorageNotifier(storageSvc)
	batchSvc.SetCountsProvider(mailSvc)
	adminSvc.SetNotifier(wsHub)
	authSvc.SetWelcomeSender(mailSvc)
	authSvc.SetStorageGetter(storageSvc)
	go func() {
		if err := mailSvc.StartSMTPServer(cfg.SMTPAddr); err != nil {
			logger.Error("smtp server failed", "error", err)
		}
	}()
	e := echo.New()
	e.HideBanner = true
	e.Logger = logger.NewEchoLogger()
	e.Use(logger.Middleware())
	e.Use(middleware.Recover())
	e.Use(middleware.BodyLimit(cfg.MaxBodySize))
	if cfg.RateLimitEnabled {
		rateLimiter := ratelimit.New(ratelimit.Config{
			DefaultRate:   float64(cfg.RateLimitDefault),
			DefaultBurst:  cfg.RateLimitBurst,
			DefaultPeriod: time.Minute,
			Rules: []ratelimit.RuleConfig{
				{PathPrefix: "/api/login", Rate: float64(cfg.RateLimitAuth), Burst: cfg.RateLimitAuthBurst, Period: time.Minute},
				{PathPrefix: "/api/register", Rate: float64(cfg.RateLimitAuth), Burst: cfg.RateLimitAuthBurst, Period: time.Minute},
				{PathPrefix: "/api/verify", Rate: 5, Burst: 3, Period: time.Minute},
				{PathPrefix: "/api/deliver", Rate: 30, Burst: 10, Period: time.Minute},
				{PathPrefix: "/api/ws", Rate: 10, Burst: 5, Period: time.Minute},
			},
			CleanupPeriod: 10 * time.Minute,
		})
		e.Use(rateLimiter.Middleware())
		logger.Info("rate limiting enabled", "default", cfg.RateLimitDefault, "auth", cfg.RateLimitAuth)
	}
	r := router.New(e, csrfSvc.Middleware, authSvc.RequireAuth, captchaSvc.Middleware, authSvc.RequireAdmin)
	r.Static("/css", "assets/public/css")
	r.Static("/js", "assets/public/js")
	r.Register(router.RouteConfig{Method: "GET", Path: "/api/downloads/:filename", Handler: func(c echo.Context) error {
	baseDir := "assets/downloads"
	filename := filepath.Base(c.Param("filename"))
	path := filepath.Join(baseDir, filename)
	absBase, _ := filepath.Abs(baseDir)
	absPath, _ := filepath.Abs(path)
	if !strings.HasPrefix(absPath, absBase) {
		return c.JSON(403, echo.Map{"error": "forbidden"})
	}
	info, err := os.Stat(path)
	if err != nil {
		return c.JSON(404, echo.Map{"error": "file not found"})
	}
	if c.QueryParam("info") == "true" {
		return c.JSON(200, echo.Map{"name": filename, "size": info.Size()})
	}
	return c.File(path)
}})
	r.Register(router.RouteConfig{Method: "GET", Path: "/media/*", Handler: media.ServeFile})
	proxySvc := proxy.NewService(cfg)
	r.Register(router.RouteConfig{Method: "GET", Path: "/api/proxy/image", Handler: proxySvc.Image})
	r.Register(router.RouteConfig{Method: "GET", Path: "/api/csrf", Handler: func(c echo.Context) error {
		return c.JSON(200, echo.Map{"csrf_token": csrfSvc.EnsureToken(c)})
	}})
	r.Register(router.RouteConfig{Method: "GET", Path: "/api/captcha/config", Handler: captchaSvc.HandleGetConfig})
	r.RegisterGroup("/api", false, false, []router.RouteConfig{
		// Auth (public with captcha)
		{Method: "POST", Path: "/register", Handler: verifySvc.StartVerification, CSRF: true, Captcha: true},
		{Method: "POST", Path: "/verify", Handler: verifySvc.VerifyAndRegister(authSvc), CSRF: true},
		{Method: "POST", Path: "/login", Handler: authSvc.Login, CSRF: true, Captcha: true},

		// Auth (authenticated)
		{Method: "POST", Path: "/logout", Handler: authSvc.Logout, CSRF: true, Auth: true},
		{Method: "GET", Path: "/me", Handler: authSvc.Me, Auth: true},
		{Method: "GET", Path: "/sessions", Handler: authSvc.ListSessions, Auth: true},
		{Method: "DELETE", Path: "/sessions/:id", Handler: authSvc.RevokeSession, CSRF: true, Auth: true},

		// Mail
		{Method: "POST", Path: "/mail/list", Handler: mailSvc.List, Auth: true},
		{Method: "GET", Path: "/mail/:token", Handler: mailSvc.Get, Auth: true},
		{Method: "POST", Path: "/mail", Handler: mailSvc.Send, CSRF: true, Auth: true},
		{Method: "DELETE", Path: "/mail/:token", Handler: mailSvc.Delete, CSRF: true, Auth: true},
		{Method: "PATCH", Path: "/mail/:token", Handler: mailSvc.Move, CSRF: true, Auth: true},
		{Method: "POST", Path: "/mail/:token/restore", Handler: mailSvc.Restore, CSRF: true, Auth: true},
		{Method: "GET", Path: "/mail/:emailToken/attachments/:attachToken", Handler: mailSvc.GetAttachmentPublic},

		// Batch operations
		{Method: "POST", Path: "/batch/move", Handler: batchSvc.Move, CSRF: true, Auth: true},
		{Method: "POST", Path: "/batch/delete", Handler: batchSvc.Delete, CSRF: true, Auth: true},
		{Method: "POST", Path: "/batch/restore", Handler: batchSvc.Restore, CSRF: true, Auth: true},

		// Internal delivery (no auth - uses delivery key)
		{Method: "POST", Path: "/deliver", Handler: mailSvc.Deliver},

		// Contacts
		{Method: "GET", Path: "/contacts", Handler: contactsSvc.List, Auth: true},
		{Method: "GET", Path: "/contacts/:id", Handler: contactsSvc.Get, Auth: true},
		{Method: "POST", Path: "/contacts", Handler: contactsSvc.Create, CSRF: true, Auth: true},
		{Method: "PUT", Path: "/contacts/:id", Handler: contactsSvc.Update, CSRF: true, Auth: true},
		{Method: "DELETE", Path: "/contacts/:id", Handler: contactsSvc.Delete, CSRF: true, Auth: true},
		{Method: "GET", Path: "/contacts/avatar/:filename", Handler: contactsSvc.ServeAvatar, Auth: true},

		// Aliases
		{Method: "GET", Path: "/aliases", Handler: aliasesSvc.List, Auth: true},
		{Method: "POST", Path: "/aliases", Handler: aliasesSvc.Create, CSRF: true, Auth: true},
		{Method: "DELETE", Path: "/aliases/:id", Handler: aliasesSvc.Delete, CSRF: true, Auth: true},

		// Drafts
		{Method: "GET", Path: "/drafts", Handler: draftsSvc.List, Auth: true},
		{Method: "GET", Path: "/drafts/:token", Handler: draftsSvc.Get, Auth: true},
		{Method: "POST", Path: "/drafts", Handler: draftsSvc.Save, CSRF: true, Auth: true},
		{Method: "DELETE", Path: "/drafts/:token", Handler: draftsSvc.Delete, CSRF: true, Auth: true},

		// Other
		{Method: "GET", Path: "/ws", Handler: wsHub.HandleConnect(wsHub.NewUpgrader(cfg.WSAllowedOrigins, cfg.WSReadBufferSize, cfg.WSWriteBufferSize)), Auth: true},

		// Admin
		{Method: "GET", Path: "/admin/users", Handler: adminSvc.ListUsers, Auth: true, Admin: true},
		{Method: "GET", Path: "/admin/users/:id", Handler: adminSvc.GetUser, Auth: true, Admin: true},
		{Method: "POST", Path: "/admin/set-role", Handler: adminSvc.SetRole, CSRF: true, Auth: true, Admin: true},
		{Method: "GET", Path: "/admin/reports", Handler: adminSvc.ListReports, Auth: true, Admin: true},
		{Method: "GET", Path: "/admin/reports/:token", Handler: adminSvc.GetReport, Auth: true, Admin: true},
		{Method: "DELETE", Path: "/admin/reports/:token", Handler: adminSvc.DeleteReport, CSRF: true, Auth: true, Admin: true},
		{Method: "POST", Path: "/admin/reports/bulk-delete", Handler: adminSvc.BulkDeleteReports, CSRF: true, Auth: true, Admin: true},
	})

	registerSPARoutes(e)
	logger.Info("server starting", "addr", cfg.HTTPAddr, "domain", cfg.Domain)
	e.Logger.Fatal(e.Start(cfg.HTTPAddr))
}

func registerSPARoutes(e *echo.Echo) {
	spaRoutes := []string{"/", "/login", "/register", "/verify", "/downloads", "/inbox", "/inbox/:token", "/sent", "/spam", "/spam/:token", "/codes", "/codes/:token", "/promotions", "/promotions/:token", "/trash", "/trash/:token", "/compose", "/drafts", "/settings", "/settings/account", "/settings/aliases", "/settings/devices", "/settings/about", "/admin", "/admin/users", "/admin/reports", "/admin/reports/:token"}
	for _, route := range spaRoutes {
		e.GET(route, spaHandler)
	}
	e.RouteNotFound("/*", spaHandler)
}
func spaHandler(c echo.Context) error {
	return c.File("assets/public/index.html")
}