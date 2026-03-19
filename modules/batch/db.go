package batch

import (
	"time"

	"georgedroyd.wtf/droydmail/modules/dbutil"
	"georgedroyd.wtf/droydmail/modules/encryption"
)

type EmailInfo struct {
	ID        int64
	Token     string
	Folder    string
	FromAddr  string
	ToAddr    string
	Subject   string
	Preview   string
	Unread    bool
	IsSystem  bool
	CreatedAt time.Time
}

func (s *Service) getEmailsByTokens(userID string, tokens []string, encKey string) (map[string]*EmailInfo, error) {
	if len(tokens) == 0 {
		return nil, nil
	}
	ph, args := dbutil.TokenArgs(tokens)
	args = append(args, userID)
	rows, err := s.db.Query(`SELECT id, token, folder, from_addr, to_addr, subject, preview, unread, is_system, created_at FROM emails WHERE token IN (`+ph+`) AND user_id = ?`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make(map[string]*EmailInfo)
	for rows.Next() {
		var e EmailInfo
		var unread, isSystem int
		if err := rows.Scan(&e.ID, &e.Token, &e.Folder, &e.FromAddr, &e.ToAddr, &e.Subject, &e.Preview, &unread, &isSystem, &e.CreatedAt); err != nil {
			continue
		}
		e.FromAddr, _ = encryption.Decrypt(e.FromAddr, encKey)
		e.ToAddr, _ = encryption.Decrypt(e.ToAddr, encKey)
		e.Subject, _ = encryption.Decrypt(e.Subject, encKey)
		e.Preview, _ = encryption.Decrypt(e.Preview, encKey)
		e.Unread = unread == 1
		e.IsSystem = isSystem == 1
		result[e.Token] = &e
	}
	return result, nil
}

func (s *Service) batchMove(userID string, tokens []string, folder string) (int, error) {
	if len(tokens) == 0 {
		return 0, nil
	}
	ph, tArgs := dbutil.TokenArgs(tokens)
	if folder == "trash" {
		args := append(tArgs, userID)
		res, err := s.db.Exec(`UPDATE emails SET previous_folder = folder, folder = 'trash' WHERE token IN (`+ph+`) AND user_id = ?`, args...)
		if err != nil {
			return 0, err
		}
		count, _ := res.RowsAffected()
		return int(count), nil
	}
	args := append([]any{folder}, tArgs...)
	args = append(args, userID)
	res, err := s.db.Exec(`UPDATE emails SET folder = ? WHERE token IN (`+ph+`) AND user_id = ?`, args...)
	if err != nil {
		return 0, err
	}
	count, _ := res.RowsAffected()
	return int(count), nil
}

func (s *Service) batchDelete(userID string, tokens []string) (int, error) {
	if len(tokens) == 0 {
		return 0, nil
	}
	ph, args := dbutil.TokenArgs(tokens)
	args = append(args, userID)
	res, err := s.db.Exec(`DELETE FROM emails WHERE token IN (`+ph+`) AND user_id = ?`, args...)
	if err != nil {
		return 0, err
	}
	count, _ := res.RowsAffected()
	return int(count), nil
}

func (s *Service) batchRestore(userID string, tokens []string) (int, error) {
	if len(tokens) == 0 {
		return 0, nil
	}
	ph, args := dbutil.TokenArgs(tokens)
	args = append(args, userID)
	res, err := s.db.Exec(`UPDATE emails SET folder = CASE WHEN previous_folder = '' OR previous_folder = 'trash' THEN 'inbox' ELSE previous_folder END, previous_folder = '' WHERE token IN (`+ph+`) AND user_id = ? AND folder = 'trash'`, args...)
	if err != nil {
		return 0, err
	}
	count, _ := res.RowsAffected()
	return int(count), nil
}