const express = require('express');
const router = express.Router();
const { Room } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');

function requireSellerOrAdmin(req, res, next) {
  if (req.user.role !== 'seller' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ seller mới có thể truy cập.' });
  }
  next();
}

// ── GET /my – Seller xem tất cả phòng của mình ───────────────────────────────
// Query: propertyId, status, page, limit
router.get('/my', authMiddleware, requireSellerOrAdmin, async (req, res) => {
  try {
    const { propertyId, status, page = 1, limit = 50 } = req.query;
    const filter = req.user.role === 'admin' ? {} : { seller: req.user.id };
    if (propertyId) filter.property = propertyId;
    if (status)     filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Room.find(filter)
        .populate('property', 'name addressLine district province')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Room.countDocuments(filter),
    ]);

    res.status(200).json({
      ok: true,
      data: items,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    console.error('GET /rooms/my error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /by-property/:propertyId – Phòng theo nhà trọ (public) ───────────────
router.get('/by-property/:propertyId', async (req, res) => {
  try {
    const rooms = await Room.find({ property: req.params.propertyId, isActive: true })
      .sort({ createdAt: -1 });
    res.status(200).json({ ok: true, data: rooms });
  } catch (error) {
    console.error('GET /rooms/by-property/:propertyId error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /:id – Chi tiết một phòng ────────────────────────────────────────────
router.get('/:id', authMiddleware, requireSellerOrAdmin, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate('property', 'name addressLine district province');
    if (!room) return res.status(404).json({ error: 'Không tìm thấy phòng.' });

    if (req.user.role === 'seller' && String(room.seller) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Không có quyền xem phòng này.' });
    }

    res.status(200).json({ ok: true, data: room });
  } catch (error) {
    console.error('GET /rooms/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST / – Seller tạo phòng mới ────────────────────────────────────────────
// Body: { propertyId, name, roomType, area, price, deposit, maxOccupants,
//         electricityRate, waterRate, internetFee, parkingFee,
//         amenities, furniture, rules, imageUrls, videoUrl }
router.post('/', authMiddleware, requireSellerOrAdmin, async (req, res) => {
  try {
    const {
      propertyId, name, roomType, area, price, deposit, maxOccupants,
      electricityRate, waterRate, internetFee, parkingFee,
      amenities, furniture, rules, imageUrls, videoUrl,
    } = req.body;

    if (!propertyId || !roomType || !area || !price) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc: propertyId, roomType, area, price.' });
    }

    const room = new Room({
      property: propertyId,
      seller: req.user.id,
      name: name || null,
      roomType,
      area: Number(area),
      price: Number(price),
      deposit: deposit ? Number(deposit) : 0,
      maxOccupants: maxOccupants ? Number(maxOccupants) : 1,
      electricityRate: electricityRate ? Number(electricityRate) : null,
      waterRate: waterRate ? Number(waterRate) : null,
      internetFee: internetFee ? Number(internetFee) : null,
      parkingFee: parkingFee ? Number(parkingFee) : null,
      amenities: amenities || [],
      furniture: furniture || [],
      rules: rules || null,
      imageUrls: imageUrls || [],
      videoUrl: videoUrl || null,
    });
    await room.save();

    res.status(201).json({ ok: true, data: room });
  } catch (error) {
    console.error('POST /rooms error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /:id/clone – Nhân bản phòng (copy all fields, reset status) ──────────
router.post('/:id/clone', authMiddleware, requireSellerOrAdmin, async (req, res) => {
  try {
    const original = await Room.findById(req.params.id);
    if (!original) return res.status(404).json({ error: 'Không tìm thấy phòng cần nhân bản.' });

    if (req.user.role === 'seller' && String(original.seller) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Không có quyền nhân bản phòng này.' });
    }

    const cloneData = original.toObject();
    delete cloneData._id;
    delete cloneData.createdAt;
    delete cloneData.updatedAt;
    cloneData.name = cloneData.name ? `${cloneData.name} (bản sao)` : 'Phòng mới (bản sao)';
    cloneData.status = 'available';
    cloneData.isActive = true;

    const cloned = new Room(cloneData);
    await cloned.save();

    res.status(201).json({ ok: true, data: cloned });
  } catch (error) {
    console.error('POST /rooms/:id/clone error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /:id – Cập nhật thông tin phòng ────────────────────────────────────
router.patch('/:id', authMiddleware, requireSellerOrAdmin, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Không tìm thấy phòng.' });

    if (req.user.role === 'seller' && String(room.seller) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Không có quyền chỉnh sửa phòng này.' });
    }

    const allowedFields = [
      'name', 'roomType', 'area', 'price', 'deposit', 'maxOccupants',
      'electricityRate', 'waterRate', 'internetFee', 'parkingFee',
      'amenities', 'furniture', 'rules', 'imageUrls', 'videoUrl',
      'status', 'isActive',
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const updated = await Room.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    res.status(200).json({ ok: true, data: updated });
  } catch (error) {
    console.error('PATCH /rooms/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── DELETE /:id – Ẩn phòng (xóa mềm) ────────────────────────────────────────
router.delete('/:id', authMiddleware, requireSellerOrAdmin, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Không tìm thấy phòng.' });

    if (req.user.role === 'seller' && String(room.seller) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Không có quyền xóa phòng này.' });
    }

    room.isActive = false;
    await room.save();

    res.status(200).json({ ok: true, message: 'Phòng đã được ẩn.' });
  } catch (error) {
    console.error('DELETE /rooms/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
