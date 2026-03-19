package proxy

import (
	"net"
	"net/url"
	"strings"
)

type Validator struct {
	blockedHosts    map[string]bool
	blockedSuffixes []string
	allowedTypes    map[string]bool
}

func NewValidator(blockedHosts, blockedSuffixes, allowedTypes []string) *Validator {
	hosts := make(map[string]bool)
	for _, h := range blockedHosts {
		hosts[strings.ToLower(h)] = true
	}
	types := make(map[string]bool)
	for _, t := range allowedTypes {
		types[strings.ToLower(t)] = true
	}
	return &Validator{
		blockedHosts:    hosts,
		blockedSuffixes: blockedSuffixes,
		allowedTypes:    types,
	}
}

func (v *Validator) IsBlockedURL(rawURL string) bool {
	u, err := url.Parse(rawURL)
	if err != nil {
		return true
	}
	return v.IsBlockedHost(u.Hostname())
}

func (v *Validator) IsBlockedHost(host string) bool {
	host = strings.ToLower(strings.TrimSpace(host))
	if host == "" {
		return true
	}
	if v.blockedHosts[host] {
		return true
	}
	for _, suffix := range v.blockedSuffixes {
		if strings.HasSuffix(host, suffix) {
			return true
		}
	}
	if ip := net.ParseIP(host); ip != nil {
		return isBlockedIP(ip)
	}
	ips, err := net.LookupIP(host)
	if err != nil || len(ips) == 0 {
		return true
	}
	for _, ip := range ips {
		if isBlockedIP(ip) {
			return true
		}
	}
	return false
}

func (v *Validator) IsAllowedContentType(contentType string) bool {
	ct := strings.ToLower(strings.Split(contentType, ";")[0])
	return v.allowedTypes[ct]
}

func isBlockedIP(ip net.IP) bool {
	if ip == nil {
		return true
	}
	if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() {
		return true
	}
	if ip4 := ip.To4(); ip4 != nil {
		if ip4[0] == 169 && ip4[1] == 254 {
			return true
		}
		if ip4[0] == 100 && ip4[1] >= 64 && ip4[1] <= 127 {
			return true
		}
	}
	return false
}