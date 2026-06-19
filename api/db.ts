import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dataDir = path.resolve(process.cwd(), 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.resolve(dataDir, 'pottery.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS fee_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    size TEXT NOT NULL,
    glaze_type TEXT NOT NULL,
    firing_fee REAL NOT NULL,
    UNIQUE(size, glaze_type)
  );

  CREATE TABLE IF NOT EXISTS kiln_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period TEXT NOT NULL UNIQUE,
    total_capacity INTEGER NOT NULL DEFAULT 10
  );

  CREATE TABLE IF NOT EXISTS bodies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    body_no TEXT NOT NULL UNIQUE,
    size TEXT NOT NULL CHECK(size IN ('small', 'medium', 'large')),
    glaze_type TEXT NOT NULL CHECK(glaze_type IN ('bisque', 'transparent', 'colored', 'crystal')),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'stored' CHECK(status IN ('stored', 'reserved', 'firing', 'completed')),
    storage_start_date TEXT NOT NULL,
    reservation_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    body_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    period TEXT NOT NULL CHECK(period IN ('morning', 'afternoon', 'evening')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'firing', 'completed', 'cancelled')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (body_id) REFERENCES bodies(id)
  );

  CREATE TABLE IF NOT EXISTS settlements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    body_id INTEGER NOT NULL,
    reservation_id INTEGER,
    firing_fee REAL NOT NULL,
    storage_days INTEGER NOT NULL,
    overdue_days INTEGER NOT NULL DEFAULT 0,
    storage_fee REAL NOT NULL DEFAULT 0,
    total_fee REAL NOT NULL,
    settled_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (body_id) REFERENCES bodies(id),
    FOREIGN KEY (reservation_id) REFERENCES reservations(id)
  );
`)

db.exec(`
  INSERT OR IGNORE INTO fee_config (size, glaze_type, firing_fee) VALUES
    ('small', 'bisque', 30), ('small', 'transparent', 40), ('small', 'colored', 50), ('small', 'crystal', 60),
    ('medium', 'bisque', 50), ('medium', 'transparent', 65), ('medium', 'colored', 80), ('medium', 'crystal', 95),
    ('large', 'bisque', 80), ('large', 'transparent', 100), ('large', 'colored', 120), ('large', 'crystal', 150);

  INSERT OR IGNORE INTO kiln_config (period, total_capacity) VALUES
    ('morning', 10), ('afternoon', 10), ('evening', 8);
`)

export { db }
