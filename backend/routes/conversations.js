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
    const filter = role === 'seller'
      ? { seller: userId }
      : { user: userId };

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
// Body: { listingId, sellerId } (userId lấy từ token)
// Hoặc { listingId, userId, sellerId } nếu admin/seller tạo
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { listingId, sellerId, userId: bodyUserId } = req.body;

    if (!sellerId) {
      return res.status(400).json({ error: 'Thiếu sellerId.' });
    }

    // userId: nếu là user thì dùng req.user.id, nếu seller/admin thì dùng bodyUserId
    const userId = req.user.role === 'user' ? req.user.id : bodyUserId;
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

module.exports = router;
