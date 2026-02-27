const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.post('/signup', (req, res) => {
    const { username, password } = req.body;
    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, password], (err) => {
        if (err) return res.status(400).json({ error: 'Duplicate ID' });
        res.json({ success: true });
    });
});

router.post('/login', (req, res) => {
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
            db.run(`
                INSERT INTO event_categories (user_id, name, color) 
                SELECT ?, '기본', '#007bff' 
                WHERE NOT EXISTS (SELECT 1 FROM event_categories WHERE user_id = ? AND name = '기본')
            `, [user.id, user.id]);
            
            db.run(`
                INSERT INTO note_folders (user_id, name, position) 
                SELECT ?, '일반', 1 
                WHERE NOT EXISTS (SELECT 1 FROM note_folders WHERE user_id = ? AND name = '일반')
            `, [user.id, user.id]);
        });
        res.json({ success: true, userId: user.id });
    });
});

router.get('/admin/users', (req, res) => { db.all(`SELECT id, username, is_approved FROM users`, [], (err, rows) => res.json(rows)); });
router.patch('/admin/users/:id/approve', (req, res) => { db.run(`UPDATE users SET is_approved = 1 WHERE id = ?`, [req.params.id], () => res.json({ success: true })); });
router.delete('/admin/users/:id', (req, res) => { db.run(`DELETE FROM users WHERE id = ?`, [req.params.id], () => res.json({ success: true })); });

module.exports = router;
