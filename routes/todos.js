const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/auth');

router.get('/todos', auth, (req, res) => { db.all("SELECT * FROM todos WHERE user_id = ? ORDER BY position ASC", [req.userId], (err, rows) => res.json(rows)); });
router.post('/todos', auth, (req, res) => {
    const { title, note, parentId, folder, dueDate, recurrence } = req.body;
    db.run(`INSERT INTO todos (user_id, title, note, parentId, folder, dueDate, recurrence, position) VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT IFNULL(MAX(position),0)+1 FROM todos WHERE user_id=?))`, 
    [req.userId, title, note, parentId, folder, dueDate, recurrence, req.userId], function() { res.json({ id: this.lastID }); });
});
router.put('/todos/:id', auth, (req, res) => {
    const { title, note, folder, dueDate, recurrence } = req.body;
    db.run(`UPDATE todos SET title=?, note=?, folder=?, dueDate=?, recurrence=? WHERE id=? AND user_id=?`, [title, note, folder, dueDate, recurrence, req.params.id, req.userId], () => res.json({success:true}));
});
router.patch('/todos/reorder', auth, (req, res) => {
    const { id, parentId, targetPosition } = req.body;
    db.run(`UPDATE todos SET parentId = ?, position = ? WHERE id = ? AND user_id = ?`, [parentId, targetPosition, id, req.userId], () => res.json({ success: true }));
});
router.patch('/todos/:id', auth, (req, res) => {
    const { isCompleted } = req.body;
    
    if (isCompleted === 1) { 
        db.get(`SELECT * FROM todos WHERE id = ? AND user_id = ?`, [req.params.id, req.userId], (err, row) => {
            if (row && row.recurrence && row.recurrence !== 'none') {
                let nextDate = new Date(row.dueDate);
                if (isNaN(nextDate.getTime())) nextDate = new Date(); 
                
                if (row.recurrence === 'daily') nextDate.setDate(nextDate.getDate() + 1);
                else if (row.recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
                else if (row.recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
                
                const nextDateStr = nextDate.toISOString().split('T')[0];
                
                db.run(`INSERT INTO todos (user_id, title, note, parentId, folder, dueDate, recurrence, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                [req.userId, row.title, row.note, row.parentId, row.folder, nextDateStr, row.recurrence, row.position + 0.001]);
                
                db.run(`UPDATE todos SET isCompleted = 1, recurrence = 'none' WHERE (id = ? OR parentId = ?) AND user_id = ?`, [req.params.id, req.params.id, req.userId], () => res.json({ success: true }));
            } else {
                db.run(`UPDATE todos SET isCompleted = 1 WHERE (id = ? OR parentId = ?) AND user_id = ?`, [req.params.id, req.params.id, req.userId], () => res.json({ success: true }));
            }
        });
    } else {
        db.run(`UPDATE todos SET isCompleted = 0 WHERE (id = ? OR parentId = ?) AND user_id = ?`, [req.params.id, req.params.id, req.userId], () => res.json({ success: true }));
    }
});
router.delete('/todos/:id', auth, (req, res) => { db.run(`DELETE FROM todos WHERE (id = ? OR parentId = ?) AND user_id = ?`, [req.params.id, req.params.id, req.userId], () => res.json({ success: true })); });

router.get('/folders', auth, (req, res) => { db.all("SELECT * FROM folders WHERE user_id = ? ORDER BY position ASC", [req.userId], (err, rows) => res.json(rows)); });
router.post('/folders', auth, (req, res) => { db.run(`INSERT INTO folders (user_id, name, position) VALUES (?, ?, (SELECT IFNULL(MAX(position),0)+1 FROM folders WHERE user_id=?))`, [req.userId, req.body.name, req.userId], () => res.json({ success: true })); });
router.put('/folders/:id', auth, (req, res) => { db.run(`UPDATE folders SET name=? WHERE id=? AND user_id=?`, [req.body.name, req.params.id, req.userId], () => res.json({ success: true })); });
router.delete('/folders/:id', auth, (req, res) => { db.run(`DELETE FROM folders WHERE id=? AND user_id=?`, [req.params.id, req.userId], () => res.json({ success: true })); });
router.patch('/folders/reorder', auth, (req, res) => {
    const { id, targetPosition } = req.body;
    db.run(`UPDATE folders SET position = ? WHERE id = ? AND user_id = ?`, [targetPosition, id, req.userId], () => res.json({ success: true }));
});

module.exports = router;
