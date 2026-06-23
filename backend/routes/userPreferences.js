const express = require('express');
const router = express.Router();
const { UserPreference } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');

const ALLOWED_ROOM_TYPES = ['single', 'shared', 'mini_apartment', 'apartment'];

// ── GET /api/user/preferences – Xem nhu cầu tìm trọ ──────────────���──────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({ error: 'Chỉ User mới có nhu cầu tìm trọ.' });
    }

    let pref = await UserPreference.findOne({ account: req.user.id });
    if (!pref) {
      // Trả về object rỗng (chưa thiết lập) thay vì 404
      return res.status(200).json({ ok: true, data: null });
    }
    res.status(200).json({ ok: true, data: pref });
  } catch (error) {
    console.error('GET /user/preferences error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PUT /api/user/preferences – Cập nhật nhu cầu tìm trọ ────────────────────
// Body: { school, preferredArea, minPrice, maxPrice, roomType,
//         maxOccupants, moveInDate, desiredAmenities }
router.put('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({ error: 'Chỉ User mới có thể thiết lập nhu cầu tìm trọ.' });
    }

    const {
      school, preferredArea,
      minPrice, maxPrice,
      roomType, maxOccupants,
      moveInDate, desiredAmenities,
    } = req.body;

    // Validate roomType nếu có
    if (roomType !== undefined && roomType !== null && !ALLOWED_ROOM_TYPES.includes(roomType)) {
      return res.status(400).json({ error: `roomType phải là một trong: ${ALLOWED_ROOM_TYPES.join(', ')}.` });
    }

    // Validate giá
    const parsedMin = minPrice !== undefined ? Number(minPrice) : undefined;
    const parsedMax = maxPrice !== undefined ? Number(maxPrice) : undefined;
    if (parsedMin !== undefined && isNaN(parsedMin)) {
      return res.status(400).json({ error: 'minPrice phải là số.' });
    }
    if (parsedMax !== undefined && isNaN(parsedMax)) {
      return res.status(400).json({ error: 'maxPrice phải là số.' });
    }
    if (parsedMin !== undefined && parsedMax !== undefined && parsedMin > parsedMax) {
      return res.status(400).json({ error: 'minPrice không được lớn hơn maxPrice.' });
    }

    const updates = {};
    if (school !== undefined)           updates.school = String(school).trim() || null;
    if (preferredArea !== undefined)     updates.preferredArea = String(preferredArea).trim() || null;
    if (parsedMin !== undefined)         updates.minPrice = isNaN(parsedMin) ? null : parsedMin;
    if (parsedMax !== undefined)         updates.maxPrice = isNaN(parsedMax) ? null : parsedMax;
    if (roomType !== undefined)          updates.roomType = roomType || null;
    if (maxOccupants !== undefined)      updates.maxOccupants = maxOccupants ? Number(maxOccupants) : null;
    if (moveInDate !== undefined)        updates.moveInDate = moveInDate ? new Date(moveInDate) : null;
    if (Array.isArray(desiredAmenities)) updates.desiredAmenities = desiredAmenities;

    const pref = await UserPreference.findOneAndUpdate(
      { account: req.user.id },
      { $set: updates },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ ok: true, data: pref });
  } catch (error) {
    console.error('PUT /user/preferences error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
