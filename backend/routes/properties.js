const express = require('express');
const router = express.Router();
const { Property } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');

// ── GET /my – Seller lấy danh sách properties của mình ──────────────────────
router.get('/my', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'seller' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ seller mới có thể truy cập.' });
    }

    const filter = req.user.role === 'admin' ? {} : { seller: req.user.id };
    const properties = await Property.find(filter).sort({ createdAt: -1 });

    res.status(200).json({ ok: true, data: properties });
  } catch (error) {
    console.error('GET /properties/my error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST / – Seller tạo property mới ────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'seller' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ seller mới có thể tạo nhà trọ.' });
    }

    const { name, addressLine, ward, district, province, location, description, imageUrls, commonAmenities } = req.body;
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

// ── PATCH /:id – Seller cập nhật property ───────────────────────────────────
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Không tìm thấy nhà trọ.' });

    const isSeller = req.user.role === 'seller' && String(property.seller) === String(req.user.id);
    const isAdmin = req.user.role === 'admin';
    if (!isSeller && !isAdmin) {
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

// ── DELETE /:id – Seller hoặc Admin xóa property ────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Không tìm thấy nhà trọ.' });

    const isSeller = req.user.role === 'seller' && String(property.seller) === String(req.user.id);
    const isAdmin = req.user.role === 'admin';
    if (!isSeller && !isAdmin) {
      return res.status(403).json({ error: 'Không có quyền xóa nhà trọ này.' });
    }

    // Xóa mềm: đặt isActive = false
    property.isActive = false;
    await property.save();

    res.status(200).json({ ok: true, message: 'Nhà trọ đã được ẩn khỏi hệ thống.' });
  } catch (error) {
    console.error('DELETE /properties/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
