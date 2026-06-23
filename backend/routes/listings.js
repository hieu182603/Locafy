const express = require('express');
const router = express.Router();
const { Listing } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');

// ── GET / – Public: danh sách listings đã duyệt ─────────────────────────────
router.get('/', async (req, res) => {
  try {
    const {
      province, district, minPrice, maxPrice, roomType,
      page = 1, limit = 20
    } = req.query;

    const filter = { status: 'approved' };
    if (province) filter.province = province;
    if (district) filter.district = district;
    if (roomType) filter.roomType = roomType;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Listing.find(filter)
        .populate('room', 'name roomType area price amenities imageUrls')
        .populate('property', 'name addressLine ward district province')
        .populate('seller', 'name avatarUrl phone')
        .sort({ isPinned: -1, isBoosted: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Listing.countDocuments(filter)
    ]);

    res.status(200).json({
      ok: true,
      data: items,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('GET /listings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /:id – Public: chi tiết listing ─────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('room')
      .populate('property')
      .populate('seller', 'name avatarUrl phone email isEmailVerified');
    if (!listing) return res.status(404).json({ error: 'Không tìm thấy tin đăng.' });

    // Tăng lượt xem
    listing.viewCount = (listing.viewCount || 0) + 1;
    await listing.save();

    res.status(200).json({ ok: true, data: listing });
  } catch (error) {
    console.error('GET /listings/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST / – Seller: tạo listing mới ────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'seller' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ seller mới có thể đăng tin.' });
    }

    const listing = new Listing({
      ...req.body,
      seller: req.user.id,
      status: 'pending', // Luôn vào hàng chờ duyệt
    });
    await listing.save();

    res.status(201).json({ ok: true, data: listing });
  } catch (error) {
    console.error('POST /listings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /:id – Seller: sửa nội dung listing ───────────────────────────────
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Không tìm thấy tin đăng.' });

    const isSeller = req.user.role === 'seller' && String(listing.seller) === String(req.user.id);
    const isAdmin = req.user.role === 'admin';
    if (!isSeller && !isAdmin) {
      return res.status(403).json({ error: 'Không có quyền chỉnh sửa tin đăng này.' });
    }

    // Seller chỉ sửa nội dung, không đổi status/seller
    const allowedFields = ['title', 'description', 'price', 'deposit', 'area', 'roomType',
      'addressLine', 'ward', 'district', 'province', 'location', 'amenities',
      'imageUrls', 'videoUrl', 'availableFrom'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    // Sau khi seller sửa → về pending để duyệt lại
    if (isSeller && Object.keys(updates).length > 0) {
      updates.status = 'pending';
    }

    const updated = await Listing.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    res.status(200).json({ ok: true, data: updated });
  } catch (error) {
    console.error('PATCH /listings/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /:id/status – Admin: duyệt / từ chối listing ──────────────────────
// Body: { status: 'approved' | 'rejected' | 'hidden', rejectedReason?: string }
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ admin mới có quyền duyệt tin.' });
    }
    const { status, rejectedReason } = req.body;
    const validStatuses = ['approved', 'rejected', 'hidden', 'pending'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `status phải là một trong: ${validStatuses.join(', ')}` });
    }

    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Không tìm thấy tin đăng.' });

    listing.status = status;
    listing.rejectedReason = status === 'rejected' ? (rejectedReason || null) : null;
    listing.reviewedBy = req.user.id;
    listing.reviewedAt = new Date();
    await listing.save();

    res.status(200).json({ ok: true, data: listing });
  } catch (error) {
    console.error('PATCH /listings/:id/status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── DELETE /:id – Seller hoặc Admin xóa listing ─────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Không tìm thấy tin đăng.' });

    const isSeller = req.user.role === 'seller' && String(listing.seller) === String(req.user.id);
    const isAdmin = req.user.role === 'admin';
    if (!isSeller && !isAdmin) {
      return res.status(403).json({ error: 'Không có quyền xóa tin đăng này.' });
    }

    // Xóa mềm: đổi status thành 'deleted'
    listing.status = 'deleted';
    await listing.save();

    res.status(200).json({ ok: true, message: 'Tin đăng đã được xóa.' });
  } catch (error) {
    console.error('DELETE /listings/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
