const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static('public'));

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
    // (기존에 만들어둔 테이블이 에러를 뱉지 않도록 안전하게 컬럼을 추가해 줍니다)
    db.run(`ALTER TABLE notes ADD COLUMN created_at TEXT`, (err) => {});
    db.run(`ALTER TABLE notes ADD COLUMN updated_at TEXT`, (err) => {});
});

const auth = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Login Required' });
    req.userId = userId;
    next();
};

// --- 인증 및 어드민 API ---
app.post('/api/signup', (req, res) => {
    const { username, password } = req.body;
    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, password], (err) => {
        if (err) return res.status(400).json({ error: 'Duplicate ID' });
        res.json({ success: true });
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const adminId = process.env.ADMIN_ID;
    const adminPw = process.env.ADMIN_PW;

    if (username === adminId && password === adminPw) {
        return res.json({ success: true, isAdmin: true, userId: 'admin' });
    }
    db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, user) => {
        if (!user) return res.status(401).json({ error: '정보 불일치' });
        if (user.is_approved === 0) return res.status(403).json({ error: '승인 대기 중' });
        db.serialize(() => {
            // 1. '기본' 카테고리가 해당 유저에게 없을 때만 추가
            db.run(`
                INSERT INTO event_categories (user_id, name, color) 
                SELECT ?, '기본', '#007bff' 
                WHERE NOT EXISTS (SELECT 1 FROM event_categories WHERE user_id = ? AND name = '기본')
            `, [user.id, user.id]);
            
            // 2. '일반' 메모 폴더가 해당 유저에게 없을 때만 추가
            db.run(`
                INSERT INTO note_folders (user_id, name, position) 
                SELECT ?, '일반', 1 
                WHERE NOT EXISTS (SELECT 1 FROM note_folders WHERE user_id = ? AND name = '일반')
            `, [user.id, user.id]);
        });
        res.json({ success: true, userId: user.id });
    });
});

app.get('/api/admin/users', (req, res) => { db.all(`SELECT id, username, is_approved FROM users`, [], (err, rows) => res.json(rows)); });
app.patch('/api/admin/users/:id/approve', (req, res) => { db.run(`UPDATE users SET is_approved = 1 WHERE id = ?`, [req.params.id], () => res.json({ success: true })); });
app.delete('/api/admin/users/:id', (req, res) => { db.run(`DELETE FROM users WHERE id = ?`, [req.params.id], () => res.json({ success: true })); });

// --- 할 일(Todo) API ---
app.get('/api/todos', auth, (req, res) => { db.all("SELECT * FROM todos WHERE user_id = ? ORDER BY position ASC", [req.userId], (err, rows) => res.json(rows)); });
app.post('/api/todos', auth, (req, res) => {
    const { title, note, parentId, folder, dueDate, recurrence } = req.body;
    db.run(`INSERT INTO todos (user_id, title, note, parentId, folder, dueDate, recurrence, position) VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT IFNULL(MAX(position),0)+1 FROM todos WHERE user_id=?))`, 
    [req.userId, title, note, parentId, folder, dueDate, recurrence, req.userId], function() { res.json({ id: this.lastID }); });
});
app.put('/api/todos/:id', auth, (req, res) => {
    const { title, note, folder, dueDate, recurrence } = req.body;
    db.run(`UPDATE todos SET title=?, note=?, folder=?, dueDate=?, recurrence=? WHERE id=? AND user_id=?`, [title, note, folder, dueDate, recurrence, req.params.id, req.userId], () => res.json({success:true}));
});
app.patch('/api/todos/reorder', auth, (req, res) => {
    const { id, parentId, targetPosition } = req.body;
    db.run(`UPDATE todos SET parentId = ?, position = ? WHERE id = ? AND user_id = ?`, [parentId, targetPosition, id, req.userId], () => res.json({ success: true }));
});
// [수정됨] 할 일 상태 변경 (반복 일정 자동 생성 로직 추가)
app.patch('/api/todos/:id', auth, (req, res) => {
    const { isCompleted } = req.body;
    
    if (isCompleted === 1) { // 완료 처리할 때
        db.get(`SELECT * FROM todos WHERE id = ? AND user_id = ?`, [req.params.id, req.userId], (err, row) => {
            if (row && row.recurrence && row.recurrence !== 'none') {
                // 다음 날짜 계산
                let nextDate = new Date(row.dueDate);
                if (isNaN(nextDate.getTime())) nextDate = new Date(); // 날짜가 없으면 오늘 기준
                
                if (row.recurrence === 'daily') nextDate.setDate(nextDate.getDate() + 1);
                else if (row.recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
                else if (row.recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
                
                const nextDateStr = nextDate.toISOString().split('T')[0];
                
                // 1. 다음 주기의 새 할 일 생성
                db.run(`INSERT INTO todos (user_id, title, note, parentId, folder, dueDate, recurrence, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                [req.userId, row.title, row.note, row.parentId, row.folder, nextDateStr, row.recurrence, row.position + 0.001]);
                
                // 2. 현재 할 일은 완료 처리하고, 무한 생성을 막기 위해 반복 속성 해제
                db.run(`UPDATE todos SET isCompleted = 1, recurrence = 'none' WHERE (id = ? OR parentId = ?) AND user_id = ?`, [req.params.id, req.params.id, req.userId], () => res.json({ success: true }));
            } else {
                // 반복이 아닌 일반 할 일의 완료 처리
                db.run(`UPDATE todos SET isCompleted = 1 WHERE (id = ? OR parentId = ?) AND user_id = ?`, [req.params.id, req.params.id, req.userId], () => res.json({ success: true }));
            }
        });
    } else {
        // 미완료로 되돌릴 때
        db.run(`UPDATE todos SET isCompleted = 0 WHERE (id = ? OR parentId = ?) AND user_id = ?`, [req.params.id, req.params.id, req.userId], () => res.json({ success: true }));
    }
});
app.delete('/api/todos/:id', auth, (req, res) => { db.run(`DELETE FROM todos WHERE (id = ? OR parentId = ?) AND user_id = ?`, [req.params.id, req.params.id, req.userId], () => res.json({ success: true })); });

app.get('/api/folders', auth, (req, res) => { db.all("SELECT * FROM folders WHERE user_id = ? ORDER BY position ASC", [req.userId], (err, rows) => res.json(rows)); });
app.post('/api/folders', auth, (req, res) => { db.run(`INSERT INTO folders (user_id, name, position) VALUES (?, ?, (SELECT IFNULL(MAX(position),0)+1 FROM folders WHERE user_id=?))`, [req.userId, req.body.name, req.userId], () => res.json({ success: true })); });
app.put('/api/folders/:id', auth, (req, res) => { db.run(`UPDATE folders SET name=? WHERE id=? AND user_id=?`, [req.body.name, req.params.id, req.userId], () => res.json({ success: true })); });
app.delete('/api/folders/:id', auth, (req, res) => { db.run(`DELETE FROM folders WHERE id=? AND user_id=?`, [req.params.id, req.userId], () => res.json({ success: true })); });
app.patch('/api/folders/reorder', auth, (req, res) => {
    const { id, targetPosition } = req.body;
    db.run(`UPDATE folders SET position = ? WHERE id = ? AND user_id = ?`, [targetPosition, id, req.userId], () => res.json({ success: true }));
});

// --- 일정(Events) API ---
app.get('/api/events', auth, (req, res) => { db.all("SELECT * FROM events WHERE user_id = ?", [req.userId], (err, rows) => res.json(rows)); });
app.post('/api/events', auth, (req, res) => {
    const { title, startDate, endDate, startTime, endTime, isAllDay, category, note } = req.body;
    db.run(`INSERT INTO events (user_id, title, startDate, endDate, startTime, endTime, isAllDay, category, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
    [req.userId, title, startDate, endDate, startTime, endTime, isAllDay?1:0, category, note], function() { res.json({ id: this.lastID }); });
});
app.put('/api/events/:id', auth, (req, res) => {
    const { title, startDate, endDate, startTime, endTime, isAllDay, category, note } = req.body;
    db.run(`UPDATE events SET title=?, startDate=?, endDate=?, startTime=?, endTime=?, isAllDay=?, category=?, note=? WHERE id=? AND user_id=?`, 
    [title, startDate, endDate, startTime, endTime, isAllDay?1:0, category, note, req.params.id, req.userId], () => res.json({ success: true }));
});
app.delete('/api/events/:id', auth, (req, res) => { db.run(`DELETE FROM events WHERE id = ? AND user_id = ?`, [req.params.id, req.userId], () => res.json({ success: true })); });
app.get('/api/event-categories', auth, (req, res) => { db.all("SELECT * FROM event_categories WHERE user_id = ?", [req.userId], (err, rows) => res.json(rows)); });
app.post('/api/event-categories', auth, (req, res) => { db.run(`INSERT INTO event_categories (user_id, name, color) VALUES (?, ?, ?)`, [req.userId, req.body.name, req.body.color], function() { res.json({ id: this.lastID }); }); });
app.put('/api/event-categories/:id', auth, (req, res) => { db.run(`UPDATE event_categories SET name=?, color=? WHERE id=? AND user_id=?`, [req.body.name, req.body.color, req.params.id, req.userId], () => res.json({ success: true })); });
app.delete('/api/event-categories/:id', auth, (req, res) => { db.run(`DELETE FROM event_categories WHERE id=? AND user_id=?`, [req.params.id, req.userId], () => res.json({ success: true })); });

// --- 메모(Notes) API ---
app.get('/api/notes', auth, (req, res) => { db.all("SELECT * FROM notes WHERE user_id = ?", [req.userId], (err, rows) => res.json(rows)); });
app.post('/api/notes', auth, (req, res) => { 
    // 작성일과 수정일 모두 현재 시간으로 삽입
    db.run(`INSERT INTO notes (user_id, title, content, folder, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))`, 
    [req.userId, req.body.title, req.body.content, req.body.folder], function() { res.json({ id: this.lastID }); }); 
});

app.put('/api/notes/:id', auth, (req, res) => { 
    // 내용이 수정될 때마다 updated_at을 현재 시간으로 업데이트
    db.run(`UPDATE notes SET title = ?, content = ?, folder = ?, updated_at = datetime('now', 'localtime') WHERE id = ? AND user_id = ?`, 
    [req.body.title, req.body.content, req.body.folder, req.params.id, req.userId], () => res.json({ success: true })); 
});
app.delete('/api/notes/:id', auth, (req, res) => { db.run(`DELETE FROM notes WHERE id = ? AND user_id = ?`, [req.params.id, req.userId], () => res.json({ success: true })); });

app.get('/api/note-folders', auth, (req, res) => { db.all("SELECT * FROM note_folders WHERE user_id = ? ORDER BY position ASC", [req.userId], (err, rows) => res.json(rows)); });
app.post('/api/note-folders', auth, (req, res) => { db.run(`INSERT INTO note_folders (user_id, name, position) VALUES (?, ?, (SELECT IFNULL(MAX(position),0)+1 FROM note_folders WHERE user_id=?))`, [req.userId, req.body.name, req.userId], () => res.json({ success: true })); });
app.put('/api/note-folders/:id', auth, (req, res) => { db.run(`UPDATE note_folders SET name=? WHERE id=? AND user_id=?`, [req.body.name, req.params.id, req.userId], () => res.json({ success: true })); });
app.delete('/api/note-folders/:id', auth, (req, res) => { db.run(`DELETE FROM note_folders WHERE id=? AND user_id=?`, [req.params.id, req.userId], () => res.json({ success: true })); });
app.patch('/api/note-folders/reorder', auth, (req, res) => {
    const { id, targetPosition } = req.body;
    db.run(`UPDATE note_folders SET position = ? WHERE id = ? AND user_id = ?`, [targetPosition, id, req.userId], () => res.json({ success: true }));
});

app.listen(PORT, () => console.log(`Server started on ${PORT}`));
