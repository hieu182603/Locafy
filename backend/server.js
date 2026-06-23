require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/locafy';

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
// JSON limit cao vì ảnh gửi dạng base64
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// ── Database Connection ───────────────────────────────────────────────────────
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Successfully connected to MongoDB.'))
  .catch(err => console.error('MongoDB connection error:', err));

// ── Routes ───────────────────────────────────────────────────────────────────
// Routes giữ lại
app.use('/api/auth',             require('./routes/auth'));
app.use('/api/listings',         require('./routes/listings'));
app.use('/api/notifications',    require('./routes/notifications'));
app.use('/api/accounts',         require('./routes/accounts'));
app.use('/api/upload',           require('./routes/upload'));

// Routes mới
app.use('/api/appointments',     require('./routes/appointments'));
app.use('/api/conversations',    require('./routes/conversations'));
app.use('/api/messages',         require('./routes/messages'));
app.use('/api/properties',       require('./routes/properties'));
app.use('/api/rooms',            require('./routes/rooms'));
app.use('/api/service-packages', require('./routes/servicePackages'));
app.use('/api/subscriptions',    require('./routes/subscriptions'));
app.use('/api/transactions',     require('./routes/transactions'));
app.use('/api/reports',          require('./routes/reports'));
app.use('/api/favorites',        require('./routes/favorites'));

// ── Healthcheck ───────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const { isConfigured } = require('./utils/mailer');
  res.status(200).json({
    ok: true,
    time: new Date().toISOString(),
    smtp: isConfigured(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ── HTTP Server & Socket.io ───────────────────────────────────────────────────
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('User connected to socket:', socket.id);

  // Join vào room theo conversationId
  socket.on('join_room', (conversationId) => {
    socket.join(conversationId);
    console.log(`Socket ${socket.id} joined room: ${conversationId}`);
  });

  // Rời room
  socket.on('leave_room', (conversationId) => {
    socket.leave(conversationId);
    console.log(`Socket ${socket.id} left room: ${conversationId}`);
  });

  // Gửi tin nhắn qua socket
  // data: { conversationId, senderId, text, type }
  socket.on('send_message', async (data) => {
    const { conversationId, senderId, text, type = 'text' } = data;
    try {
      const { Message, Conversation } = require('./models');

      // Tạo Message mới
      const message = new Message({
        conversation: conversationId,
        sender: senderId,
        type,
        text: text || null,
      });
      await message.save();

      // Cập nhật Conversation: lastMessage, lastMessageAt
      const conv = await Conversation.findById(conversationId);
      if (conv) {
        conv.lastMessage = text || '[Tin nhắn]';
        conv.lastMessageAt = new Date();
        conv.lastMessageBy = senderId;

        // Tăng unread counter cho phía nhận
        if (String(conv.user) === String(senderId)) {
          conv.unreadBySeller = (conv.unreadBySeller || 0) + 1;
        } else {
          conv.unreadByUser = (conv.unreadByUser || 0) + 1;
        }
        await conv.save();
      }

      // Phát tới tất cả client trong room
      io.to(conversationId).emit('receive_message', {
        _id: message._id,
        conversation: conversationId,
        sender: senderId,
        type,
        text,
        createdAt: message.createdAt,
      });
    } catch (error) {
      console.error('Socket send_message error:', error);
      socket.emit('message_error', { error: 'Không thể gửi tin nhắn. Vui lòng thử lại.' });
    }
  });

  // Typing indicator
  socket.on('typing', (data) => {
    const { conversationId, senderId } = data;
    socket.to(conversationId).emit('typing', { senderId });
  });

  socket.on('stop_typing', (data) => {
    const { conversationId, senderId } = data;
    socket.to(conversationId).emit('stop_typing', { senderId });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected from socket:', socket.id);
  });
});

// ── Start Server ──────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, () => {
    console.log(`Locafy Express API Server running on port ${PORT}`);
  });
}

// Export app cho Vercel serverless deployment
module.exports = app;
