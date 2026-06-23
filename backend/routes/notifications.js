const express = require('express');
const router = express.Router();
const { Notification } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');

// ── GET / – Lấy thông báo của user hiện tại ──────────────────────────────────
// Query: isRead (true|false), page, limit
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { isRead, page = 1, limit = 20 } = req.query;

    const filter = { recipient: req.user.id };
    if (isRead === 'true')  filter.isRead = true;
    if (isRead === 'false') filter.isRead = false;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: req.user.id, isRead: false }),
    ]);

    res.status(200).json({
      ok: true,
      data: items,
      unreadCount,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('GET /notifications error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /:id/read – Đánh dấu 1 thông báo đã đọc ───────────────────────────
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.id,
    });
    if (!notification) return res.status(404).json({ error: 'Không tìm thấy thông báo.' });

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    res.status(200).json({ ok: true, data: notification });
  } catch (error) {
    console.error('PATCH /notifications/:id/read error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /read-all – Đánh dấu tất cả đã đọc ────────────────────────────────
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.status(200).json({ ok: true, updated: result.modifiedCount });
  } catch (error) {
    console.error('PATCH /notifications/read-all error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── DELETE /:id – Xóa 1 thông báo của user ───────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id,
    });
    if (!notification) return res.status(404).json({ error: 'Không tìm thấy thông báo.' });

    res.status(200).json({ ok: true, message: 'Đã xóa thông báo.' });
  } catch (error) {
    console.error('DELETE /notifications/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── Internal helper: tạo notification (dùng trong các route khác) ─────────────
// Dùng: const { createNotification } = require('./notifications');
async function createNotification({ recipient, type, title, body = null, entityType = null, entityId = null }) {
  try {
    const notif = new Notification({ recipient, type, title, body, entityType, entityId });
    await notif.save();
    return notif;
  } catch (err) {
    console.error('createNotification error:', err.message);
    return null;
  }
}

module.exports = router;
module.exports.createNotification = createNotification;
