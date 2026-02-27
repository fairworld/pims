// middlewares/auth.js
const auth = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Login Required' });
    req.userId = userId;
    next(); // 인증 성공 시 다음 로직으로 넘어감
};

module.exports = auth;
