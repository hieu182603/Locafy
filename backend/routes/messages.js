const express = require('express');
const router = express.Router();
const { Message, Conversation } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');

// ── GET /:conversationId – Lấy tin nhắn của một conversation ────────────────
router.get('/:conversationId', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Kiểm tra conversation có thuộc về user không
    const conv = await Conversation.findById(conversationId);
    if (!conv) return res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện.' });

    const userId = req.user.id;
    const role = req.user.role;
    const isParticipant =
      String(conv.user) === String(userId) ||
      String(conv.seller) === String(userId) ||
      role === 'admin';

    if (!isParticipant) {
      return res.status(403).json({ error: 'Không có quyền xem tin nhắn này.' });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [messages, total] = await Promise.all([
      Message.find({ conversation: conversationId, isDeleted: false })
        .populate('sender', 'name avatarUrl role')
        .populate('sharedListing', 'title price imageUrls')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(Number(limit)),
      Message.countDocuments({ conversation: conversationId, isDeleted: false })
    ]);

    // Đánh dấu đã đọc các tin nhắn chưa đọc
    await Message.updateMany(
      { conversation: conversationId, sender: { $ne: userId }, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    // Reset unread counter
    if (String(conv.user) === String(userId)) {
      conv.unreadByUser = 0;
    } else if (String(conv.seller) === String(userId)) {
      conv.unreadBySeller = 0;
    }
    await conv.save();

    res.status(200).json({
      ok: true,
      data: messages,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    console.error('GET /messages/:conversationId error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST / – Gửi tin nhắn mới ───────────────────────────────────────────────
// Body: { conversationId, text, type?, imageUrl?, sharedListingId? }
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { conversationId, text, type = 'text', imageUrl, sharedListingId } = req.body;
    if (!conversationId) {
      return res.status(400).json({ error: 'Thiếu conversationId.' });
    }
    if (type === 'text' && !text) {
      return res.status(400).json({ error: 'Thiếu nội dung tin nhắn.' });
    }

    const conv = await Conversation.findById(conversationId);
    if (!conv) return res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện.' });

    const userId = req.user.id;
    const isParticipant =
      String(conv.user) === String(userId) ||
      String(conv.seller) === String(userId);

    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Không có quyền gửi tin nhắn trong cuộc trò chuyện này.' });
    }

    const message = new Message({
      conversation: conversationId,
      sender: userId,
      type,
      text: text || null,
      imageUrl: imageUrl || null,
      sharedListing: sharedListingId || null,
    });
    await message.save();

    // Cập nhật Conversation cache
    conv.lastMessage = text || (type === 'image' ? '[Hình ảnh]' : '[Tin nhắn]');
    conv.lastMessageAt = new Date();
    conv.lastMessageBy = userId;

    // Tăng counter unread cho phía còn lại
    if (String(conv.user) === String(userId)) {
      conv.unreadBySeller = (conv.unreadBySeller || 0) + 1;
    } else {
      conv.unreadByUser = (conv.unreadByUser || 0) + 1;
    }
    await conv.save();

    await message.populate('sender', 'name avatarUrl role');

    res.status(201).json({ ok: true, data: message });
  } catch (error) {
    console.error('POST /messages error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
