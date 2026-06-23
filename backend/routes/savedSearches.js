const express = require('express');
const router = express.Router();
const { SavedSearch } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');

const MAX_SAVED_SEARCHES = 10; // Giới hạn số tìm kiếm lưu mỗi user

// ── GET /api/user/saved-searches – Danh sách tìm kiếm đã lưu ─────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const items = await SavedSearch.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ ok: true, data: items });
  } catch (error) {
    console.error('GET /user/saved-searches error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/user/saved-searches – Lưu một tìm kiếm mới ─────────────────────
// Body: { name?, filters: { keyword, area, district, province, minPrice, maxPrice,
//          minArea, maxArea, roomType, amenities, maxOccupants, availableFrom },
//         notifyEnabled? }
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Giới hạn số lượng
    const count = await SavedSearch.countDocuments({ user: req.user.id });
    if (count >= MAX_SAVED_SEARCHES) {
      return res.status(400).json({
        error: `Bạn chỉ có thể lưu tối đa ${MAX_SAVED_SEARCHES} tìm kiếm. Vui lòng xóa bớt.`,
      });
    }

    const { name, filters = {}, notifyEnabled = true } = req.body;

    if (!filters || Object.keys(filters).length === 0) {
      return res.status(400).json({ error: 'Vui lòng cung cấp ít nhất một bộ lọc.' });
    }

    const savedSearch = new SavedSearch({
      user: req.user.id,
      name: name ? String(name).trim() : null,
      filters: {
        keyword: filters.keyword || null,
        area: filters.area || null,
        district: filters.district || null,
        province: filters.province || null,
        minPrice: filters.minPrice ? Number(filters.minPrice) : null,
        maxPrice: filters.maxPrice ? Number(filters.maxPrice) : null,
        minArea: filters.minArea ? Number(filters.minArea) : null,
        maxArea: filters.maxArea ? Number(filters.maxArea) : null,
        roomType: filters.roomType || null,
        amenities: Array.isArray(filters.amenities) ? filters.amenities : [],
        maxOccupants: filters.maxOccupants ? Number(filters.maxOccupants) : null,
        availableFrom: filters.availableFrom ? new Date(filters.availableFrom) : null,
      },
      notifyEnabled,
    });

    await savedSearch.save();
    res.status(201).json({ ok: true, data: savedSearch });
  } catch (error) {
    console.error('POST /user/saved-searches error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /api/user/saved-searches/:id – Cập nhật (đổi tên / toggle notify) ──
// Body: { name?, notifyEnabled? }
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, notifyEnabled } = req.body;
    const updates = {};
    if (name !== undefined)           updates.name = String(name).trim() || null;
    if (notifyEnabled !== undefined)  updates.notifyEnabled = Boolean(notifyEnabled);

    const item = await SavedSearch.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: updates },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: 'Không tìm thấy tìm kiếm đã lưu.' });

    res.status(200).json({ ok: true, data: item });
  } catch (error) {
    console.error('PATCH /user/saved-searches/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── DELETE /api/user/saved-searches/:id – Xóa một tìm kiếm ──────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const item = await SavedSearch.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!item) return res.status(404).json({ error: 'Không tìm thấy tìm kiếm đã lưu.' });

    res.status(200).json({ ok: true, message: 'Đã xóa tìm kiếm.' });
  } catch (error) {
    console.error('DELETE /user/saved-searches/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
