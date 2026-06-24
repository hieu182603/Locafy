require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/locafy';

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
// JSON limit cao vì ảnh gửi dạng base64
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Database Connection ───────────────────────────────────────────────────────
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log(`\x1b[32m[✓] MongoDB connected successfully to: ${MONGODB_URI.split('@').pop()}\x1b[0m\n`);
  })
  .catch(err => {
    console.error(`\x1b[31m[✗] MongoDB connection error:\x1b[0m`, err);
  });

// ── Routes ───────────────────────────────────────────────────────────────────
// ── PayOS Webhook (phải đặt TRƯỚC express.json để nhận raw body nếu cần) ─────
app.use('/api/transactions/webhook', require('./routes/transactions'));

// ── Auth & Accounts ───────────────────────────────────────────────────────────
app.use('/api/auth',             require('./routes/auth'));
app.use('/api/accounts',         require('./routes/accounts'));

// ── User-specific ─────────────────────────────────────────────────────────────
app.use('/api/user/preferences',    require('./routes/userPreferences'));
app.use('/api/user/view-history',   require('./routes/viewHistory'));
app.use('/api/user/saved-searches', require('./routes/savedSearches'));
app.use('/api/favorites',           require('./routes/favorites'));

// ── Seller-specific ───────────────────────────────────────────────────────────
app.use('/api/seller/profile',    require('./routes/sellerProfile'));
app.use('/api/seller/listings',   require('./routes/sellerListings'));
app.use('/api/seller/customers',  require('./routes/sellerCustomers'));

// ── Listings & Search (Public + Admin) ───────────────────────────────────────
app.use('/api/listings',         require('./routes/listings'));

// ── Properties & Rooms ───────────────────────────────────────────────────────
app.use('/api/properties',       require('./routes/properties'));
app.use('/api/rooms',            require('./routes/rooms'));

// ── Appointments, Conversations, Messages ────────────────────────────────────
app.use('/api/appointments',     require('./routes/appointments'));
app.use('/api/conversations',    require('./routes/conversations'));
app.use('/api/messages',         require('./routes/messages'));

// ── Notifications ─────────────────────────────────────────────────────────────
app.use('/api/notifications',    require('./routes/notifications'));

// ── Service Packages, Subscriptions, Transactions ────────────────────────────
app.use('/api/service-packages', require('./routes/servicePackages'));
app.use('/api/subscriptions',    require('./routes/subscriptions'));
app.use('/api/transactions',     require('./routes/transactions'));

// ── Reports & Upload ──────────────────────────────────────────────────────────
app.use('/api/reports',          require('./routes/reports'));
app.use('/api/upload',           require('./routes/upload'));

// ── Admin ─────────────────────────────────────────────────────────────────────
app.use('/api/admin',            require('./routes/admin'));

// ── Content Management (Banner, Article, Coupon) ──────────────────────────────
app.use('/api/banners',          require('./routes/banners'));
app.use('/api/articles',         require('./routes/articles'));
app.use('/api/coupons',          require('./routes/coupons'));

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
const jwt = require('jsonwebtoken');

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Expose io cho các route dùng (messages.js emit sau khi save)
app.set('io', io);

// Socket auth middleware – xác thực JWT
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Unauthenticated'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'locafy_secret_key_2026_super_secure_fallback');
    socket.userId = decoded.id || decoded._id;
    socket.userRole = decoded.role;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  // Join vào room theo conversationId
  socket.on('join_room', (conversationId) => {
    socket.join(conversationId);
  });

  // Rời room khi đổi conversation
  socket.on('leave_room', (conversationId) => {
    socket.leave(conversationId);
  });

  // Typing indicator – chỉ broadcast sang client còn lại trong room
  socket.on('typing', ({ conversationId }) => {
    socket.to(conversationId).emit('typing', { senderId: socket.userId });
  });

  socket.on('stop_typing', ({ conversationId }) => {
    socket.to(conversationId).emit('stop_typing', { senderId: socket.userId });
  });

  socket.on('disconnect', () => {});
});

// ── Start Server ──────────────────────────────────────────────────────────────
if (require.main === module || process.env.NODE_ENV !== 'production') {
  server.listen(PORT, () => {
    const { isConfigured } = require('./utils/mailer');
    const smtpStatus = isConfigured() 
      ? '\x1b[32mConfigured ✓\x1b[0m' 
      : '\x1b[33mNot Configured (Demo mode) ⚠\x1b[0m';
    const smtpStatusPlain = isConfigured() ? 'Configured ✓' : 'Not Configured (Demo mode) ⚠';

    const logLine = (label, valPlain, valColored, icon = '•') => {
      const plainText = `  ${icon} ${label}: ${valPlain}`;
      const padding = ' '.repeat(Math.max(0, 60 - plainText.length));
      console.log(`\x1b[36m│\x1b[0m\x1b[1m  ${icon} ${label}:\x1b[0m ${valColored}${padding}\x1b[36m│\x1b[0m`);
    };

    console.log('\n\x1b[36m┌────────────────────────────────────────────────────────────┐\x1b[0m');
    console.log('\x1b[36m│\x1b[0m             \x1b[1m\x1b[32mLOCAFY EXPRESS API SERVER RUNNING\x1b[0m              \x1b[36m│\x1b[0m');
    console.log('\x1b[36m├────────────────────────────────────────────────────────────┤\x1b[0m');
    logLine('Port', PORT.toString(), PORT.toString());
    logLine('Env', process.env.NODE_ENV || 'development', process.env.NODE_ENV || 'development');
    logLine('URL', `http://localhost:${PORT}/api`, `\x1b[4mhttp://localhost:${PORT}/api\x1b[0m`);
    logLine('Health', `http://localhost:${PORT}/api/health`, `\x1b[4mhttp://localhost:${PORT}/api/health\x1b[0m`);
    logLine('SMTP Mailer', smtpStatusPlain, smtpStatus);
    console.log('\x1b[36m└────────────────────────────────────────────────────────────┘\x1b[0m\n');
  });
}

// Export app cho Vercel serverless deployment
module.exports = app;
