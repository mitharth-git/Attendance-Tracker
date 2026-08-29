export const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  semester TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS holidays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  group_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS class_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  room_no TEXT NOT NULL DEFAULT '',
  attendance_status TEXT NOT NULL CHECK (
    attendance_status IN ('SCHEDULED', 'ATTENDED', 'NOT_ATTENDED', 'CANCELED')
  ),
  reason TEXT,
  series_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_class_sessions_start ON class_sessions(start_at);
CREATE INDEX IF NOT EXISTS idx_class_sessions_subject ON class_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_series ON class_sessions(series_id);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
`
