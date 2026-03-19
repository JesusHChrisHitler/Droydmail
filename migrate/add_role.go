package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	if len(os.Args) < 2 {
		log.Fatal("Usage: go run add_role.go <db_path>")
	}
	dbPath := os.Args[1]

	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	var hasRole, hasPlan int
	db.QueryRow(`SELECT COUNT(*) FROM pragma_table_info('users') WHERE name = 'role'`).Scan(&hasRole)
	db.QueryRow(`SELECT COUNT(*) FROM pragma_table_info('users') WHERE name = 'plan'`).Scan(&hasPlan)

	if hasRole > 0 && hasPlan == 0 {
		fmt.Println("Already migrated - role exists, plan removed")
		return
	}

	var userCount int
	db.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&userCount)
	fmt.Printf("Found %d users to migrate\n", userCount)

	_, err = db.Exec(`
		CREATE TABLE users_new (
			id TEXT PRIMARY KEY,
			username_idx TEXT NOT NULL,
			username_enc TEXT NOT NULL,
			password_hash TEXT NOT NULL,
			encryption_key TEXT NOT NULL DEFAULT '',
			recovery_email_idx TEXT,
			recovery_email_enc TEXT,
			register_ip TEXT NOT NULL,
			last_login_ip TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			role TEXT NOT NULL DEFAULT 'user'
		)
	`)
	if err != nil {
		log.Fatal("Failed to create new table:", err)
	}
	fmt.Println("Created new users table with role column")

	_, err = db.Exec(`
		INSERT INTO users_new (id, username_idx, username_enc, password_hash, encryption_key, recovery_email_idx, recovery_email_enc, register_ip, last_login_ip, created_at, role)
		SELECT id, username_idx, username_enc, password_hash, encryption_key, recovery_email_idx, recovery_email_enc, register_ip, last_login_ip, created_at, 'user'
		FROM users
	`)
	if err != nil {
		log.Fatal("Failed to copy data:", err)
	}
	fmt.Printf("Copied %d users with role='user'\n", userCount)

	_, err = db.Exec(`DROP TABLE users`)
	if err != nil {
		log.Fatal("Failed to drop old table:", err)
	}
	fmt.Println("Dropped old users table")

	_, err = db.Exec(`ALTER TABLE users_new RENAME TO users`)
	if err != nil {
		log.Fatal("Failed to rename table:", err)
	}
	fmt.Println("Renamed users_new to users")

	db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_idx ON users(username_idx)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_users_recovery_email_idx ON users(recovery_email_idx)`)
	fmt.Println("Recreated indexes")

	fmt.Println("Migration complete - plan column removed, role column added")
}