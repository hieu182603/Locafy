const express = require('express');
const router = express.Router();
const { Banner } = require('../models');
const adminMiddleware = require('../middlewares/adminMiddleware');

// ── GET / – Public: lấy danh sách banner đang hoạt động ─────────────────────
// Query: position (home_top|home_middle|search_top|sidebar)
router.get('/', async (req, res) => {
  try {
    const { position } = req.query;
    const now = new Date();
    const filter = {
      isActive: true,
      $or: [
        { startsAt: null },
        { startsAt: { $lte: now } },
      ],
      $and: [
        {
          $or: [
            { endsAt: null },
            { endsAt: { $gte: now } },
          ],
        },
      ],
    };
    if (position) filter.position = position;

    const banners = await Banner.find(filter).sort({ sortOrder: 1, createdAt: -1 });
    res.status(200).json({ ok: true, data: banners });
  } catch (error) {
    console.error('GET /banners error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /all – Admin: lấy tất cả banner (bao gồm không active) ───────────────
router.get('/all', adminMiddleware, async (req, res) => {
  try {
    const { isActive, position, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (position) filter.position = position;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Banner.find(filter)
        .populate('createdBy', 'name email')
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Banner.countDocuments(filter),
    ]);

    res.status(200).json({
      ok: true,
      data: items,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('GET /banners/all error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST / – Admin tạo banner mới ────────────────────────────────────────────
// Body: { title, imageUrl, linkUrl?, position?, isActive?, sortOrder?, startsAt?, endsAt? }
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { title, imageUrl, linkUrl, position, isActive, sortOrder, startsAt, endsAt } = req.body;
    if (!title || !imageUrl) {
      return res.status(400).json({ error: 'Thiếu title hoặc imageUrl.' });
    }

    const banner = new Banner({
      title,
      imageUrl,
      linkUrl: linkUrl || null,
      position: position || 'home_top',
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
      startsAt: startsAt || null,
      endsAt: endsAt || null,
      createdBy: req.user.id,
    });
    await banner.save();

    res.status(201).json({ ok: true, data: banner });
  } catch (error) {
    console.error('POST /banners error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /:id – Admin cập nhật banner ───────────────────────────────────────
router.patch('/:id', adminMiddleware, async (req, res) => {
  try {
    const allowedFields = ['title', 'imageUrl', 'linkUrl', 'position', 'isActive', 'sortOrder', 'startsAt', 'endsAt'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const banner = await Banner.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    );
    if (!banner) return res.status(404).json({ error: 'Không tìm thấy banner.' });

    res.status(200).json({ ok: true, data: banner });
  } catch (error) {
    console.error('PATCH /banners/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── DELETE /:id – Admin xóa banner ───────────────────────────────────────────
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Không tìm thấy banner.' });

    res.status(200).json({ ok: true, message: 'Banner đã được xóa.' });
  } catch (error) {
    console.error('DELETE /banners/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
