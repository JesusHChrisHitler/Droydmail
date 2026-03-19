package roles

var valid = map[string]bool{
	"user":  true,
	"admin": true,
}

func Valid(s string) bool {
	return valid[s]
}

func All() []string {
	names := make([]string, 0, len(valid))
	for name := range valid {
		names = append(names, name)
	}
	return names
}