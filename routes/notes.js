const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/auth');

router.get('/notes', auth, (req, res) => { db.all("SELECT * FROM notes WHERE user_id = ?", [req.userId], (err, rows) => res.json(rows)); });
router.post('/notes', auth, (req, res) => { 
    db.run(`INSERT INTO notes (user_id, title, content, folder, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))`, 
    [req.userId, req.body.title, req.body.content, req.body.folder], function() { res.json({ id: this.lastID }); }); 
});
router.put('/notes/:id', auth, (req, res) => { 
    db.run(`UPDATE notes SET title = ?, content = ?, folder = ?, updated_at = datetime('now', 'localtime') WHERE id = ? AND user_id = ?`, 
    [req.body.title, req.body.content, req.body.folder, req.params.id, req.userId], () => res.json({ success: true })); 
});
router.delete('/notes/:id', auth, (req, res) => { db.run(`DELETE FROM notes WHERE id = ? AND user_id = ?`, [req.params.id, req.userId], () => res.json({ success: true })); });

router.get('/note-folders', auth, (req, res) => { db.all("SELECT * FROM note_folders WHERE user_id = ? ORDER BY position ASC", [req.userId], (err, rows) => res.json(rows)); });
router.post('/note-folders', auth, (req, res) => { db.run(`INSERT INTO note_folders (user_id, name, position) VALUES (?, ?, (SELECT IFNULL(MAX(position),0)+1 FROM note_folders WHERE user_id=?))`, [req.userId, req.body.name, req.userId], () => res.json({ success: true })); });
router.put('/note-folders/:id', auth, (req, res) => { db.run(`UPDATE note_folders SET name=? WHERE id=? AND user_id=?`, [req.body.name, req.params.id, req.userId], () => res.json({ success: true })); });
router.delete('/note-folders/:id', auth, (req, res) => { db.run(`DELETE FROM note_folders WHERE id=? AND user_id=?`, [req.params.id, req.userId], () => res.json({ success: true })); });
router.patch('/note-folders/reorder', auth, (req, res) => {
    const { id, targetPosition } = req.body;
    db.run(`UPDATE note_folders SET position = ? WHERE id = ? AND user_id = ?`, [targetPosition, id, req.userId], () => res.json({ success: true }));
});

module.exports = router;
