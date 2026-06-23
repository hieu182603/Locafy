const express = require('express');
const router = express.Router();
const { Appointment, Listing } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');
const { createNotification } = require('./notifications');

// ── GET / – Lấy appointments theo role ──────────────────────────────────────
// Query: status, page, limit
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { role, id } = req.user;
    const filter = {};

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
      Appointment.countDocuments(filter),
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
    console.error('GET /appointments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /:id – Chi tiết 1 lịch hẹn ──────────────────────────────────────────
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('listing', 'title price imageUrls')
      .populate('room', 'name roomType area')
      .populate('user', 'name phone email avatarUrl')
      .populate('seller', 'name phone email avatarUrl');

    if (!appointment) return res.status(404).json({ error: 'Không tìm thấy lịch hẹn.' });

    const { role, id: userId } = req.user;
    const isParticipant =
      String(appointment.user._id) === String(userId) ||
      String(appointment.seller._id) === String(userId) ||
      role === 'admin';

    if (!isParticipant) {
      return res.status(403).json({ error: 'Không có quyền xem lịch hẹn này.' });
    }

    res.status(200).json({ ok: true, data: appointment });
  } catch (error) {
    console.error('GET /appointments/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST / – User đặt lịch hẹn xem phòng ────────────────────────────────────
// Body: { listingId, sellerId, scheduledAt, userNote? }
// roomId lấy từ listing nếu không truyền
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({ error: 'Chỉ user mới có thể đặt lịch hẹn.' });
    }

    const { listingId, sellerId, scheduledAt, userNote } = req.body;

    if (!listingId || !sellerId || !scheduledAt) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc: listingId, sellerId, scheduledAt.' });
    }

    // Validate scheduledAt phải là tương lai
    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: 'scheduledAt không hợp lệ.' });
    }
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ error: 'Thời gian hẹn phải là thời điểm trong tương lai.' });
    }

    // Lấy roomId từ listing
    const listing = await Listing.findById(listingId).select('room seller status');
    if (!listing) return res.status(404).json({ error: 'Không tìm thấy tin đăng.' });
    if (listing.status !== 'approved') {
      return res.status(400).json({ error: 'Chỉ có thể đặt lịch cho tin đăng đã được duyệt.' });
    }

    // Kiểm tra trùng lịch (cùng user + listing + pending/confirmed)
    const existing = await Appointment.findOne({
      user: req.user.id,
      listing: listingId,
      status: { $in: ['pending', 'confirmed'] },
    });
    if (existing) {
      return res.status(409).json({
        error: 'Bạn đã có lịch hẹn đang chờ hoặc đã xác nhận cho tin đăng này.',
        existingId: existing._id,
      });
    }

    const appointment = new Appointment({
      listing: listingId,
      room: listing.room || null,
      seller: sellerId,
      user: req.user.id,
      scheduledAt: scheduledDate,
      userNote: userNote || null,
      status: 'pending',
    });
    await appointment.save();

    // Gửi thông báo cho Seller
    await createNotification({
      recipient: sellerId,
      type: 'appointment_new',
      title: 'Lịch hẹn mới',
      body: `Có khách muốn xem phòng vào ${scheduledDate.toLocaleDateString('vi-VN')}.`,
      entityType: 'appointment',
      entityId: appointment._id,
    });

    res.status(201).json({ ok: true, data: appointment });
  } catch (error) {
    console.error('POST /appointments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /:id/reschedule – User đổi lịch hẹn ────────────────────────────────
// Body: { scheduledAt, userNote? }
router.patch('/:id/reschedule', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({ error: 'Chỉ user mới có thể đổi lịch hẹn.' });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Không tìm thấy lịch hẹn.' });
    if (String(appointment.user) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Không có quyền đổi lịch hẹn này.' });
    }
    if (!['pending', 'proposed'].includes(appointment.status)) {
      return res.status(400).json({ error: 'Chỉ có thể đổi lịch khi đang chờ hoặc seller đã đề xuất lại.' });
    }

    const { scheduledAt, userNote } = req.body;
    const newDate = new Date(scheduledAt);
    if (isNaN(newDate.getTime())) {
      return res.status(400).json({ error: 'scheduledAt không hợp lệ.' });
    }
    if (newDate <= new Date()) {
      return res.status(400).json({ error: 'Thời gian hẹn phải là thời điểm trong tương lai.' });
    }

    appointment.scheduledAt = newDate;
    appointment.status = 'pending'; // Reset về pending để seller xác nhận lại
    if (userNote !== undefined) appointment.userNote = userNote;
    await appointment.save();

    // Thông báo cho Seller
    await createNotification({
      recipient: appointment.seller,
      type: 'appointment_new',
      title: 'Khách đổi lịch hẹn',
      body: `Khách đã đổi lịch xem phòng sang ${newDate.toLocaleDateString('vi-VN')}.`,
      entityType: 'appointment',
      entityId: appointment._id,
    });

    res.status(200).json({ ok: true, data: appointment });
  } catch (error) {
    console.error('PATCH /appointments/:id/reschedule error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /:id/status – Cập nhật trạng thái lịch hẹn ────────────────────────
// User: cancelled
// Seller: confirmed, proposed, cancelled, completed, no_show
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Không tìm thấy lịch hẹn.' });

    const { role, id: userId } = req.user;
    const { status, cancelReason, proposedAt, proposedNote, sellerNote } = req.body;

    const isUser   = role === 'user'   && String(appointment.user)   === String(userId);
    const isSeller = role === 'seller' && String(appointment.seller) === String(userId);
    const isAdmin  = role === 'admin';

    if (!isUser && !isSeller && !isAdmin) {
      return res.status(403).json({ error: 'Không có quyền cập nhật lịch hẹn này.' });
    }

    // Validate quyền theo role
    if (isUser && status !== 'cancelled') {
      return res.status(403).json({ error: 'User chỉ có thể hủy lịch hẹn.' });
    }
    const sellerAllowed = ['confirmed', 'proposed', 'cancelled', 'completed', 'no_show'];
    if (isSeller && !sellerAllowed.includes(status)) {
      return res.status(400).json({ error: `Trạng thái không hợp lệ cho seller. Cho phép: ${sellerAllowed.join(', ')}` });
    }

    appointment.status = status;

    if (status === 'cancelled') {
      appointment.cancelledBy = isUser ? 'user' : 'seller';
      appointment.cancelReason = cancelReason || null;
    }
    if (status === 'proposed') {
      if (!proposedAt) return res.status(400).json({ error: 'Thiếu proposedAt khi đề xuất lại lịch.' });
      appointment.proposedAt = new Date(proposedAt);
      appointment.proposedNote = proposedNote || null;
    }
    if (sellerNote !== undefined) {
      appointment.sellerNote = sellerNote;
    }

    await appointment.save();

    // Gửi thông báo tương ứng
    const notifMap = {
      confirmed:  { to: appointment.user,   type: 'appointment_confirmed', title: 'Lịch hẹn được xác nhận' },
      proposed:   { to: appointment.user,   type: 'appointment_proposed',  title: 'Seller đề xuất lịch mới' },
      cancelled:  { to: isUser ? appointment.seller : appointment.user, type: 'appointment_cancelled', title: 'Lịch hẹn đã bị hủy' },
    };
    const notifConfig = notifMap[status];
    if (notifConfig) {
      await createNotification({
        recipient: notifConfig.to,
        type: notifConfig.type,
        title: notifConfig.title,
        entityType: 'appointment',
        entityId: appointment._id,
      });
    }

    res.status(200).json({ ok: true, data: appointment });
  } catch (error) {
    console.error('PATCH /appointments/:id/status error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
