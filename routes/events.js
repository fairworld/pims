const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/auth');

router.get('/events', auth, (req, res) => { db.all("SELECT * FROM events WHERE user_id = ?", [req.userId], (err, rows) => res.json(rows)); });
router.post('/events', auth, (req, res) => {
    const { title, startDate, endDate, startTime, endTime, isAllDay, category, note } = req.body;
    db.run(`INSERT INTO events (user_id, title, startDate, endDate, startTime, endTime, isAllDay, category, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
    [req.userId, title, startDate, endDate, startTime, endTime, isAllDay?1:0, category, note], function() { res.json({ id: this.lastID }); });
});
router.put('/events/:id', auth, (req, res) => {
    const { title, startDate, endDate, startTime, endTime, isAllDay, category, note } = req.body;
    db.run(`UPDATE events SET title=?, startDate=?, endDate=?, startTime=?, endTime=?, isAllDay=?, category=?, note=? WHERE id=? AND user_id=?`, 
    [title, startDate, endDate, startTime, endTime, isAllDay?1:0, category, note, req.params.id, req.userId], () => res.json({ success: true }));
});
router.delete('/events/:id', auth, (req, res) => { db.run(`DELETE FROM events WHERE id = ? AND user_id = ?`, [req.params.id, req.userId], () => res.json({ success: true })); });

router.get('/event-categories', auth, (req, res) => { db.all("SELECT * FROM event_categories WHERE user_id = ?", [req.userId], (err, rows) => res.json(rows)); });
router.post('/event-categories', auth, (req, res) => { db.run(`INSERT INTO event_categories (user_id, name, color) VALUES (?, ?, ?)`, [req.userId, req.body.name, req.body.color], function() { res.json({ id: this.lastID }); }); });
router.put('/event-categories/:id', auth, (req, res) => { db.run(`UPDATE event_categories SET name=?, color=? WHERE id=? AND user_id=?`, [req.body.name, req.body.color, req.params.id, req.userId], () => res.json({ success: true })); });
router.delete('/event-categories/:id', auth, (req, res) => { db.run(`DELETE FROM event_categories WHERE id=? AND user_id=?`, [req.params.id, req.userId], () => res.json({ success: true })); });

module.exports = router;
