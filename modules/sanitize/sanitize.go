package sanitize

import (
	"encoding/base64"
	"regexp"
	"strings"
)

type Sanitizer struct {
	allowedTags       map[string]bool
	allowedAttrs      map[string]map[string]bool
	tagRegex          *regexp.Regexp
	attrRegex         *regexp.Regexp
	scriptRegex       *regexp.Regexp
	styleContentRegex *regexp.Regexp
	eventRegex        *regexp.Regexp
	jsURLRegex        *regexp.Regexp
}

func New() *Sanitizer {
	return &Sanitizer{
		allowedTags: map[string]bool{
			"p": true, "br": true, "hr": true,
			"h1": true, "h2": true, "h3": true, "h4": true, "h5": true, "h6": true,
			"strong": true, "b": true, "em": true, "i": true, "u": true, "s": true,
			"ul": true, "ol": true, "li": true,
			"a": true, "img": true,
			"table": true, "thead": true, "tbody": true, "tr": true, "td": true, "th": true,
			"div": true, "span": true, "blockquote": true, "pre": true, "code": true,
			"font": true, "center": true,
		},
		allowedAttrs: map[string]map[string]bool{
			"a":     {"href": true, "title": true, "target": true},
			"img":   {"src": true, "alt": true, "width": true, "height": true, "title": true},
			"td":    {"colspan": true, "rowspan": true, "align": true, "valign": true},
			"th":    {"colspan": true, "rowspan": true, "align": true, "valign": true},
			"font":  {"color": true, "size": true, "face": true},
			"div":   {"align": true},
			"p":     {"align": true},
			"table": {"border": true, "cellpadding": true, "cellspacing": true, "width": true},
			"*":     {"style": true, "class": true},
		},
		tagRegex:          regexp.MustCompile(`<(/?)([a-zA-Z][a-zA-Z0-9]*)\s*([^>]*)>`),
		attrRegex:         regexp.MustCompile(`([a-zA-Z][a-zA-Z0-9\-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))`),
		scriptRegex:       regexp.MustCompile(`(?is)<script[^>]*>.*?</script>`),
		styleContentRegex: regexp.MustCompile(`(?is)<style[^>]*>.*?</style>`),
		eventRegex:        regexp.MustCompile(`(?i)\s*on[a-z]+\s*=`),
		jsURLRegex:        regexp.MustCompile(`(?i)^\s*javascript\s*:`),
	}
}

func (s *Sanitizer) Sanitize(html string) string {
	if html == "" {
		return ""
	}
	html = s.scriptRegex.ReplaceAllString(html, "")
	html = s.styleContentRegex.ReplaceAllString(html, "")
	html = s.tagRegex.ReplaceAllStringFunc(html, s.sanitizeTag)
	return html
}

func (s *Sanitizer) sanitizeTag(tag string) string {
	matches := s.tagRegex.FindStringSubmatch(tag)
	if matches == nil {
		return ""
	}

	closing := matches[1]
	tagName := strings.ToLower(matches[2])
	attrs := matches[3]

	if !s.allowedTags[tagName] {
		return ""
	}

	if closing == "/" {
		return "</" + tagName + ">"
	}

	sanitizedAttrs := s.sanitizeAttrs(tagName, attrs)

	selfClosing := ""
	if tagName == "br" || tagName == "hr" || tagName == "img" {
		selfClosing = " /"
	}

	if sanitizedAttrs == "" {
		return "<" + tagName + selfClosing + ">"
	}
	return "<" + tagName + " " + sanitizedAttrs + selfClosing + ">"
}

func (s *Sanitizer) sanitizeAttrs(tagName, attrs string) string {
	if s.eventRegex.MatchString(attrs) {
		attrs = s.eventRegex.ReplaceAllString(attrs, " data-removed=")
	}

	var result []string
	matches := s.attrRegex.FindAllStringSubmatch(attrs, -1)

	for _, match := range matches {
		attrName := strings.ToLower(match[1])
		attrValue := match[2]
		if attrValue == "" {
			attrValue = match[3]
		}
		if attrValue == "" {
			attrValue = match[4]
		}

		if !s.isAttrAllowed(tagName, attrName) {
			continue
		}

		if attrName == "href" || attrName == "src" {
			if s.jsURLRegex.MatchString(attrValue) {
				continue
			}
			if strings.HasPrefix(strings.ToLower(strings.TrimSpace(attrValue)), "data:") && tagName != "img" {
				continue
			}
			if attrName == "src" && tagName == "img" {
				lowVal := strings.ToLower(strings.TrimSpace(attrValue))
				if strings.HasPrefix(lowVal, "http://") || strings.HasPrefix(lowVal, "https://") {
					attrValue = "/api/proxy/image?url=" + base64.URLEncoding.EncodeToString([]byte(attrValue))
				}
			}
		}

		if attrName == "style" {
			attrValue = s.sanitizeStyle(attrValue)
		}

		result = append(result, attrName+`="`+s.escapeAttrValue(attrValue)+`"`)
	}

	return strings.Join(result, " ")
}

func (s *Sanitizer) isAttrAllowed(tagName, attrName string) bool {
	if s.allowedAttrs["*"][attrName] {
		return true
	}
	if tagAttrs, ok := s.allowedAttrs[tagName]; ok {
		return tagAttrs[attrName]
	}
	return false
}

func (s *Sanitizer) sanitizeStyle(style string) string {
	dangerousProps := []string{"behavior", "expression", "javascript", "vbscript", "url("}
	lower := strings.ToLower(style)
	for _, prop := range dangerousProps {
		if strings.Contains(lower, prop) {
			return ""
		}
	}
	return style
}

func (s *Sanitizer) escapeAttrValue(value string) string {
	value = strings.ReplaceAll(value, `"`, "&quot;")
	value = strings.ReplaceAll(value, `<`, "&lt;")
	value = strings.ReplaceAll(value, `>`, "&gt;")
	return value
}