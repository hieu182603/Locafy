const express = require('express');
const router = express.Router();
const { Appointment } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');

// ── GET / – Lấy appointments theo role ──────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { role, id } = req.user;
    let filter = {};

    if (role === 'admin') {
      // Admin xem tất cả
    } else if (role === 'seller') {
      filter.seller = id;
    } else {
      filter.user = id;
    }

    const { status, page = 1, limit = 20 } = req.query;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Appointment.find(filter)
        .populate('listing', 'title price imageUrls')
        .populate('room', 'name roomType area')
        .populate('user', 'name phone email avatarUrl')
        .populate('seller', 'name phone email avatarUrl')
        .sort({ scheduledAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Appointment.countDocuments(filter)
    ]);

    res.status(200).json({
      ok: true,
      data: items,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    console.error('GET /appointments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST / – User đặt lịch hẹn xem phòng ───────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'user' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ user mới có thể đặt lịch hẹn.' });
    }

    const { listingId, roomId, sellerId, scheduledAt, userNote } = req.body;
    if (!listingId || !roomId || !sellerId || !scheduledAt) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc: listingId, roomId, sellerId, scheduledAt.' });
    }

    const appointment = new Appointment({
      listing: listingId,
      room: roomId,
      seller: sellerId,
      user: req.user.id,
      scheduledAt: new Date(scheduledAt),
      userNote: userNote || null,
      status: 'pending',
    });
    await appointment.save();

    res.status(201).json({ ok: true, data: appointment });
  } catch (error) {
    console.error('POST /appointments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /:id/status – Cập nhật trạng thái lịch hẹn ───────────────────────
// User: cancelled
// Seller: confirmed, proposed, cancelled, completed, no_show
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Không tìm thấy lịch hẹn.' });

    const { role, id: userId } = req.user;
    const { status, cancelReason, proposedAt, proposedNote, sellerNote } = req.body;

    const isUser = role === 'user' && String(appointment.user) === String(userId);
    const isSeller = role === 'seller' && String(appointment.seller) === String(userId);
    const isAdmin = role === 'admin';

    if (!isUser && !isSeller && !isAdmin) {
      return res.status(403).json({ error: 'Không có quyền cập nhật lịch hẹn này.' });
    }

    // Kiểm tra quyền theo role
    if (isUser && !['cancelled'].includes(status)) {
      return res.status(403).json({ error: 'User chỉ có thể hủy lịch hẹn.' });
    }
    if (isSeller && !['confirmed', 'proposed', 'cancelled', 'completed', 'no_show'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ cho seller.' });
    }

    appointment.status = status;
    if (status === 'cancelled') {
      appointment.cancelledBy = isUser ? 'user' : 'seller';
      appointment.cancelReason = cancelReason || null;
    }
    if (status === 'proposed') {
      appointment.proposedAt = proposedAt ? new Date(proposedAt) : null;
      appointment.proposedNote = proposedNote || null;
    }
    if (sellerNote !== undefined) {
      appointment.sellerNote = sellerNote;
    }

    await appointment.save();
    res.status(200).json({ ok: true, data: appointment });
  } catch (error) {
    console.error('PATCH /appointments/:id/status error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
