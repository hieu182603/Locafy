const express = require('express');
const router = express.Router();
const { Room } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');

// ── GET /by-property/:propertyId – Lấy rooms theo property ─────────────────
router.get('/by-property/:propertyId', async (req, res) => {
  try {
    const filter = {
      property: req.params.propertyId,
      isActive: true,
    };

    const rooms = await Room.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ ok: true, data: rooms });
  } catch (error) {
    console.error('GET /rooms/by-property/:propertyId error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST / – Seller tạo room mới ─────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'seller' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ seller mới có thể thêm phòng.' });
    }

    const { propertyId, name, roomType, area, price, deposit, maxOccupants,
      electricityRate, waterRate, internetFee, parkingFee,
      amenities, furniture, rules, imageUrls, videoUrl } = req.body;

    if (!propertyId || !roomType || !area || !price) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc: propertyId, roomType, area, price.' });
    }

    const room = new Room({
      property: propertyId,
      seller: req.user.id,
      name: name || null,
      roomType,
      area,
      price,
      deposit: deposit || 0,
      maxOccupants: maxOccupants || 1,
      electricityRate: electricityRate || null,
      waterRate: waterRate || null,
      internetFee: internetFee || null,
      parkingFee: parkingFee || null,
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

// ── PATCH /:id – Seller cập nhật phòng ──────────────────────────────────────
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Không tìm thấy phòng.' });

    const isSeller = req.user.role === 'seller' && String(room.seller) === String(req.user.id);
    const isAdmin = req.user.role === 'admin';
    if (!isSeller && !isAdmin) {
      return res.status(403).json({ error: 'Không có quyền chỉnh sửa phòng này.' });
    }

    const allowedFields = ['name', 'roomType', 'area', 'price', 'deposit', 'maxOccupants',
      'electricityRate', 'waterRate', 'internetFee', 'parkingFee',
      'amenities', 'furniture', 'rules', 'imageUrls', 'videoUrl', 'status', 'isActive'];
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

// ── DELETE /:id – Seller hoặc Admin xóa phòng ───────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Không tìm thấy phòng.' });

    const isSeller = req.user.role === 'seller' && String(room.seller) === String(req.user.id);
    const isAdmin = req.user.role === 'admin';
    if (!isSeller && !isAdmin) {
      return res.status(403).json({ error: 'Không có quyền xóa phòng này.' });
    }

    // Xóa mềm
    room.isActive = false;
    await room.save();

    res.status(200).json({ ok: true, message: 'Phòng đã được ẩn khỏi hệ thống.' });
  } catch (error) {
    console.error('DELETE /rooms/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
