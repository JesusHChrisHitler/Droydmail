package roles

func (s *Service) updateRole(userID, role string) (int64, error) {
	result, err := s.db.Exec(`UPDATE users SET role = ? WHERE id = ?`, role, userID)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}