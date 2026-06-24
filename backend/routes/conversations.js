const express = require('express');
const router = express.Router();
const { Conversation } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');

// ── GET / – Lấy conversations của user hiện tại ──────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    // Tìm tất cả conversations mà user tham gia (theo role)
    let filter = {};
    if (role === 'seller') {
      filter = { seller: userId };
    } else if (role === 'user') {
      filter = { user: userId };
    }
    // admin: filter rỗng → lấy tất cả

    const conversations = await Conversation.find(filter)
      .populate('listing', 'title price imageUrls status')
      .populate('user', 'name avatarUrl')
      .populate('seller', 'name avatarUrl')
      .populate('lastMessageBy', 'name')
      .sort({ lastMessageAt: -1 });

    res.status(200).json({ ok: true, data: conversations });
  } catch (error) {
    console.error('GET /conversations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST / – Tìm hoặc tạo conversation ──────────────────────────────────────
// Body: { listingId, sellerId } (userId lấy từ token nếu là user)
// Hoặc { listingId, userId, sellerId } nếu admin tạo thay user
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { listingId, sellerId, userId: bodyUserId } = req.body;

    if (!sellerId) {
      return res.status(400).json({ error: 'Thiếu sellerId.' });
    }

    // userId: user dùng id của mình; admin truyền bodyUserId; seller không được tạo thay user
    let userId;
    if (req.user.role === 'user') {
      userId = req.user.id;
    } else if (req.user.role === 'admin') {
      userId = bodyUserId;
    } else {
      return res.status(403).json({ error: 'Seller không thể tạo conversation thay người dùng.' });
    }
    if (!userId) {
      return res.status(400).json({ error: 'Thiếu userId.' });
    }

    // findOrCreate
    const query = { user: userId, seller: sellerId };
    if (listingId) query.listing = listingId;

    let conversation = await Conversation.findOne(query);

    if (!conversation) {
      conversation = new Conversation({
        listing: listingId || null,
        user: userId,
        seller: sellerId,
      });
      await conversation.save();
    }

    await conversation.populate([
      { path: 'listing', select: 'title price imageUrls' },
      { path: 'user', select: 'name avatarUrl' },
      { path: 'seller', select: 'name avatarUrl' },
    ]);

    res.status(200).json({ ok: true, data: conversation });
  } catch (error) {
    console.error('POST /conversations error:', error);
    // Duplicate key – conversation đã tồn tại
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Conversation đã tồn tại.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /:id/read – Đánh dấu conversation đã đọc ──────────────────────────
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ error: 'Không tìm thấy cuộc trò chuyện.' });

    const userId = req.user.id;
    const isUser   = String(conv.user)   === String(userId);
    const isSeller = String(conv.seller) === String(userId);

    if (!isUser && !isSeller && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Không có quyền truy cập cuộc trò chuyện này.' });
    }

    if (isUser)   conv.unreadByUser   = 0;
    if (isSeller) conv.unreadBySeller = 0;
    await conv.save();

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('PATCH /conversations/:id/read error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
