const express = require('express');
const router = express.Router();
const { ViewHistory } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');

// ── GET /api/user/view-history – Lịch sử phòng đã xem ───────────────────────
// Query: page, limit
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      ViewHistory.find({ user: req.user.id })
        .populate({
          path: 'listing',
          select: 'title price area roomType imageUrls status district province seller',
          populate: { path: 'seller', select: 'name avatarUrl' },
        })
        .sort({ viewedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ViewHistory.countDocuments({ user: req.user.id }),
    ]);

    // Lọc bỏ listing đã bị xóa / null (listing đã bị xóa cứng)
    const filtered = items.filter(item => item.listing !== null);

    res.status(200).json({
      ok: true,
      data: filtered,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('GET /user/view-history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── DELETE /api/user/view-history – Xóa toàn bộ lịch sử xem ─────────────────
router.delete('/', authMiddleware, async (req, res) => {
  try {
    const result = await ViewHistory.deleteMany({ user: req.user.id });
    res.status(200).json({ ok: true, deleted: result.deletedCount });
  } catch (error) {
    console.error('DELETE /user/view-history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── DELETE /api/user/view-history/:listingId – Xóa 1 mục ────────────────────
router.delete('/:listingId', authMiddleware, async (req, res) => {
  try {
    const result = await ViewHistory.findOneAndDelete({
      user: req.user.id,
      listing: req.params.listingId,
    });
    if (!result) return res.status(404).json({ error: 'Không tìm thấy mục lịch sử.' });
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('DELETE /user/view-history/:listingId error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
