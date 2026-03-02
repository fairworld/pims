// config/db.js
const sqlite3 = require('sqlite3').verbose();

// DB 연결
const db = new sqlite3.Database('./data/todo.db');

// [DB 초기화] 유저별 데이터 관리를 위한 테이블 생성
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, is_approved INTEGER DEFAULT 0)`);
    db.run(`CREATE TABLE IF NOT EXISTS todos (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, title TEXT, note TEXT, parentId INTEGER, folder TEXT, dueDate TEXT, isCompleted INTEGER DEFAULT 0, recurrence TEXT DEFAULT 'none', position REAL)`);
    db.run(`CREATE TABLE IF NOT EXISTS folders (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT, position REAL)`);
    db.run(`CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, title TEXT, startDate TEXT, endDate TEXT, startTime TEXT, endTime TEXT, isAllDay INTEGER, category TEXT, note TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS event_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT, color TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, title TEXT, content TEXT, folder TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS note_folders (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT, position REAL)`);
    db.run(`CREATE TABLE IF NOT EXISTS settings (user_id INTEGER PRIMARY KEY, otp_secret TEXT, otp_enabled INTEGER DEFAULT 0)`);
    
    db.run(`ALTER TABLE notes ADD COLUMN created_at TEXT`, (err) => {});
    db.run(`ALTER TABLE notes ADD COLUMN updated_at TEXT`, (err) => {});

    db.run(`ALTER TABLE events ADD COLUMN recurrence TEXT DEFAULT 'none'`, (err) => {});
    db.run(`ALTER TABLE events ADD COLUMN recurrenceEndDate TEXT`, (err) => {});
});

// 다른 파일에서 db 객체를 사용할 수 있도록 내보냅니다.
module.exports = db;
