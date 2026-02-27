// server.js
const express = require('express');
const bodyParser = require('body-parser');

// 라우터 모듈 불러오기
const authRoutes = require('./routes/auth');
const todoRoutes = require('./routes/todos');
const eventRoutes = require('./routes/events');
const noteRoutes = require('./routes/notes');

const app = express();
const PORT = 3000;

app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static('public'));

// 모든 라우터를 '/api' 경로 밑에 등록합니다.
// 이렇게 하면 기존 프론트엔드와 동일하게 /api/todos 등을 호출할 수 있습니다.
app.use('/api', authRoutes);
app.use('/api', todoRoutes);
app.use('/api', eventRoutes);
app.use('/api', noteRoutes);

app.listen(PORT, () => console.log(`Server started on ${PORT}`));
