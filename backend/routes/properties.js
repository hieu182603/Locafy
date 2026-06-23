const express = require('express');
const router = express.Router();
const { Property, Room, Listing } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');

function requireSellerOrAdmin(req, res, next) {
  if (req.user.role !== 'seller' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ seller mới có thể truy cập.' });
  }
  next();
}

// ── GET /my – Seller lấy danh sách nhà trọ của mình ─────────────────────────
router.get('/my', authMiddleware, requireSellerOrAdmin, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { seller: req.user.id };

    const properties = await Property.find(filter).sort({ createdAt: -1 });

    // Đếm số phòng cho mỗi property
    const propertyIds = properties.map(p => p._id);
    const roomCounts = await Room.aggregate([
      { $match: { property: { $in: propertyIds }, isActive: true } },
      { $group: { _id: '$property', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    roomCounts.forEach(r => { countMap[String(r._id)] = r.count; });

    const data = properties.map(p => ({
      ...p.toObject(),
      roomCount: countMap[String(p._id)] || 0,
    }));

    res.status(200).json({ ok: true, data });
  } catch (error) {
    console.error('GET /properties/my error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /:id – Chi tiết một nhà trọ (kèm danh sách phòng) ───────────────────
router.get('/:id', authMiddleware, requireSellerOrAdmin, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Không tìm thấy nhà trọ.' });

    // Chỉ seller sở hữu hoặc admin mới xem được
    if (req.user.role === 'seller' && String(property.seller) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Không có quyền xem nhà trọ này.' });
    }

    const rooms = await Room.find({ property: property._id, isActive: true }).sort({ createdAt: -1 });

    res.status(200).json({ ok: true, data: { ...property.toObject(), rooms } });
  } catch (error) {
    console.error('GET /properties/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST / – Seller tạo nhà trọ mới ─────────────────────────────────────────
// Body: { name, addressLine, ward, district, province, location,
//         description, imageUrls, commonAmenities }
router.post('/', authMiddleware, requireSellerOrAdmin, async (req, res) => {
  try {
    const { name, addressLine, ward, district, province, location,
      description, imageUrls, commonAmenities } = req.body;

    if (!name || !addressLine) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc: name, addressLine.' });
    }

    const property = new Property({
      seller: req.user.id,
      name,
      addressLine,
      ward: ward || null,
      district: district || null,
      province: province || null,
      location: location || undefined,
      description: description || null,
      imageUrls: imageUrls || [],
      commonAmenities: commonAmenities || [],
    });
    await property.save();

    res.status(201).json({ ok: true, data: property });
  } catch (error) {
    console.error('POST /properties error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /:id – Cập nhật thông tin nhà trọ ─────────────────────────────────
router.patch('/:id', authMiddleware, requireSellerOrAdmin, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Không tìm thấy nhà trọ.' });

    if (req.user.role === 'seller' && String(property.seller) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Không có quyền chỉnh sửa nhà trọ này.' });
    }

    const allowedFields = ['name', 'description', 'addressLine', 'ward', 'district',
      'province', 'location', 'imageUrls', 'commonAmenities', 'isActive'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const updated = await Property.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    res.status(200).json({ ok: true, data: updated });
  } catch (error) {
    console.error('PATCH /properties/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── DELETE /:id – Ẩn nhà trọ (xóa mềm) ─────────────────────────────────────
router.delete('/:id', authMiddleware, requireSellerOrAdmin, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Không tìm thấy nhà trọ.' });

    if (req.user.role === 'seller' && String(property.seller) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Không có quyền xóa nhà trọ này.' });
    }

    property.isActive = false;
    await property.save();

    res.status(200).json({ ok: true, message: 'Nhà trọ đã được ẩn.' });
  } catch (error) {
    console.error('DELETE /properties/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
