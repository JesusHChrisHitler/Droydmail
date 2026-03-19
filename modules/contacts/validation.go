package contacts

import (
	"georgedroyd.wtf/droydmail/modules/validation"
)

func validateEmail(email string) error {
	if err := validation.Email(email, "email"); err != nil {
		return ErrInvalidEmail
	}
	return nil
}

func validateName(name string) error {
	name = validation.TrimSpace(name)
	if name == "" || len(name) > 128 {
		return ErrInvalidName
	}
	return nil
}