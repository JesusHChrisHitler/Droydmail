package router

import (
	"github.com/labstack/echo/v4"
)

type RouteConfig struct {
	Method   string
	Path     string
	Handler  echo.HandlerFunc
	CSRF     bool
	Auth     bool
	Captcha  bool
	Admin    bool
}

type Router struct {
	echo      *echo.Echo
	csrfMw    echo.MiddlewareFunc
	authMw    echo.MiddlewareFunc
	captchaMw echo.MiddlewareFunc
	adminMw   echo.MiddlewareFunc
}

func New(e *echo.Echo, csrfMw, authMw, captchaMw, adminMw echo.MiddlewareFunc) *Router {
	return &Router{echo: e, csrfMw: csrfMw, authMw: authMw, captchaMw: captchaMw, adminMw: adminMw}
}

func (r *Router) Register(cfg RouteConfig) {
	var middlewares []echo.MiddlewareFunc
	if cfg.Auth {
		middlewares = append(middlewares, r.authMw)
	}
	if cfg.Admin && r.adminMw != nil {
		middlewares = append(middlewares, r.adminMw)
	}
	if cfg.CSRF {
		middlewares = append(middlewares, r.csrfMw)
	}
	if cfg.Captcha && r.captchaMw != nil {
		middlewares = append(middlewares, r.captchaMw)
	}
	switch cfg.Method {
	case "GET":
		r.echo.GET(cfg.Path, cfg.Handler, middlewares...)
	case "POST":
		r.echo.POST(cfg.Path, cfg.Handler, middlewares...)
	case "PUT":
		r.echo.PUT(cfg.Path, cfg.Handler, middlewares...)
	case "PATCH":
		r.echo.PATCH(cfg.Path, cfg.Handler, middlewares...)
	case "DELETE":
		r.echo.DELETE(cfg.Path, cfg.Handler, middlewares...)
	}
}

func (r *Router) RegisterGroup(prefix string, csrf, auth bool, routes []RouteConfig) {
	for _, route := range routes {
		route.Path = prefix + route.Path
		if route.CSRF == false {
			route.CSRF = csrf
		}
		if route.Auth == false {
			route.Auth = auth
		}
		r.Register(route)
	}
}

func (r *Router) Static(path, dir string) {
	r.echo.Static(path, dir)
}