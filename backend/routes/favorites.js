const express = require('express');
const router = express.Router();
const { Favorite, Listing } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');

// ── GET / – Favorites của user hiện tại ─────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [favorites, total] = await Promise.all([
      Favorite.find({ user: req.user.id })
        .populate({
          path: 'listing',
          select: 'title price area roomType imageUrls status district province seller',
          populate: { path: 'seller', select: 'name avatarUrl phone' }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Favorite.countDocuments({ user: req.user.id })
    ]);

    res.status(200).json({
      ok: true,
      data: favorites,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    console.error('GET /favorites error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /toggle – Thêm hoặc bỏ yêu thích ───────────────────────────────────
// Body: { listingId }
router.post('/toggle', authMiddleware, async (req, res) => {
  try {
    const { listingId } = req.body;
    if (!listingId) {
      return res.status(400).json({ error: 'Thiếu listingId.' });
    }

    // Kiểm tra listing có tồn tại không
    const listing = await Listing.findById(listingId).select('_id saveCount');
    if (!listing) return res.status(404).json({ error: 'Không tìm thấy tin đăng.' });

    const existing = await Favorite.findOne({ user: req.user.id, listing: listingId });

    if (existing) {
      // Bỏ yêu thích
      await Favorite.deleteOne({ _id: existing._id });
      // Giảm saveCount
      if (listing.saveCount > 0) {
        listing.saveCount -= 1;
        await listing.save();
      }
      return res.status(200).json({ ok: true, favorited: false, message: 'Đã bỏ yêu thích.' });
    } else {
      // Thêm yêu thích
      const favorite = new Favorite({ user: req.user.id, listing: listingId });
      await favorite.save();
      // Tăng saveCount
      listing.saveCount = (listing.saveCount || 0) + 1;
      await listing.save();
      return res.status(201).json({ ok: true, favorited: true, message: 'Đã thêm vào yêu thích.' });
    }
  } catch (error) {
    console.error('POST /favorites/toggle error:', error);
    // Duplicate key (race condition)
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Listing đã được yêu thích trước đó.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// ── GET /check/:listingId – Kiểm tra user đã yêu thích listing chưa ─────────
router.get('/check/:listingId', authMiddleware, async (req, res) => {
  try {
    const exists = await Favorite.findOne({ user: req.user.id, listing: req.params.listingId });
    res.status(200).json({ ok: true, favorited: !!exists });
  } catch (error) {
    console.error('GET /favorites/check/:listingId error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
