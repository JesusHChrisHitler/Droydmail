package aliases

import (
	"database/sql"
	"strings"
	"time"

	"georgedroyd.wtf/droydmail/modules/encryption"
	"georgedroyd.wtf/droydmail/modules/token"
	"georgedroyd.wtf/droydmail/modules/validation"
)

type Alias struct {
	ID        string
	UserID    string
	Alias     string
	CreatedAt time.Time
	DeletedAt *time.Time
}

func Migrate(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS aliases (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			alias_idx TEXT NOT NULL,
			alias_enc TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			deleted_at DATETIME DEFAULT NULL,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		);
		CREATE INDEX IF NOT EXISTS idx_aliases_user_id ON aliases(user_id);
		CREATE UNIQUE INDEX IF NOT EXISTS idx_aliases_alias_idx ON aliases(alias_idx) WHERE deleted_at IS NULL;
	`)
	return err
}

func (s *Service) createAlias(userID, alias string) (*Alias, error) {
	alias = validation.Sanitize(alias)
	if err := validation.Alias(alias, s.reserved); err != nil {
		return nil, &ValidationError{Message: err.Message}
	}

	if s.identity.NameTaken(alias) {
		return nil, ErrAliasTaken
	}

	existing, _ := s.getAliasByNameIncludeDeleted(alias)
	if existing != nil {
		if existing.UserID == userID && existing.DeletedAt != nil {
			now := time.Now()
			_, err := s.db.Exec(`UPDATE aliases SET deleted_at = NULL, created_at = ? WHERE id = ?`, now, existing.ID)
			if err != nil {
				return nil, err
			}
			return &Alias{ID: existing.ID, UserID: userID, Alias: alias, CreatedAt: now, DeletedAt: nil}, nil
		}
		return nil, ErrAliasTaken
	}

	count, _ := s.countAliases(userID)
	if count >= s.maxAliases {
		return nil, ErrMaxAliases
	}

	id := token.Generate(token.AliasIDLen)
	now := time.Now()
	aliasIdx, aliasEnc := encryption.EncryptIdentifier(alias, s.masterKey)
	_, err := s.db.Exec(
		`INSERT INTO aliases (id, user_id, alias_idx, alias_enc, created_at) VALUES (?, ?, ?, ?, ?)`,
		id, userID, aliasIdx, aliasEnc, now,
	)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			return nil, ErrAliasTaken
		}
		return nil, err
	}
	return &Alias{ID: id, UserID: userID, Alias: alias, CreatedAt: now}, nil
}

func (s *Service) listAliases(userID string) ([]Alias, error) {
	rows, err := s.db.Query(`SELECT id, user_id, alias_enc, created_at FROM aliases WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var aliases []Alias
	for rows.Next() {
		var a Alias
		var aliasEnc string
		if err := rows.Scan(&a.ID, &a.UserID, &aliasEnc, &a.CreatedAt); err != nil {
			return nil, err
		}
		a.Alias, _ = encryption.DecryptWithMaster(aliasEnc, s.masterKey)
		aliases = append(aliases, a)
	}
	return aliases, nil
}

func (s *Service) countAliases(userID string) (int, error) {
	var count int
	err := s.db.QueryRow(`SELECT COUNT(*) FROM aliases WHERE user_id = ? AND deleted_at IS NULL`, userID).Scan(&count)
	return count, err
}

func (s *Service) getAliasByName(alias string) (*Alias, error) {
	var a Alias
	var aliasEnc string
	aliasIdx := encryption.HashIdentifier(strings.ToLower(alias), s.masterKey)
	err := s.db.QueryRow(`SELECT id, user_id, alias_enc, created_at FROM aliases WHERE alias_idx = ? AND deleted_at IS NULL`, aliasIdx).Scan(&a.ID, &a.UserID, &aliasEnc, &a.CreatedAt)
	if err != nil {
		return nil, err
	}
	a.Alias, _ = encryption.DecryptWithMaster(aliasEnc, s.masterKey)
	return &a, nil
}

func (s *Service) getAliasByNameIncludeDeleted(alias string) (*Alias, error) {
	var a Alias
	var aliasEnc string
	var deletedAt *time.Time
	aliasIdx := encryption.HashIdentifier(strings.ToLower(alias), s.masterKey)
	err := s.db.QueryRow(`SELECT id, user_id, alias_enc, created_at, deleted_at FROM aliases WHERE alias_idx = ?`, aliasIdx).Scan(&a.ID, &a.UserID, &aliasEnc, &a.CreatedAt, &deletedAt)
	if err != nil {
		return nil, err
	}
	a.Alias, _ = encryption.DecryptWithMaster(aliasEnc, s.masterKey)
	a.DeletedAt = deletedAt
	return &a, nil
}

func (s *Service) deleteAlias(userID, aliasID string) error {
	now := time.Now()
	result, err := s.db.Exec(`UPDATE aliases SET deleted_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL`, now, aliasID, userID)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Service) getAliasById(userID, aliasID string) (*Alias, error) {
	var a Alias
	var aliasEnc string
	err := s.db.QueryRow(`SELECT id, user_id, alias_enc, created_at FROM aliases WHERE id = ? AND user_id = ? AND deleted_at IS NULL`, aliasID, userID).Scan(&a.ID, &a.UserID, &aliasEnc, &a.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}
	a.Alias, _ = encryption.DecryptWithMaster(aliasEnc, s.masterKey)
	return &a, nil
}

func (s *Service) GetUserByAlias(alias string) (string, error) {
	a, err := s.getAliasByName(alias)
	if err != nil {
		return "", err
	}
	return a.UserID, nil
}