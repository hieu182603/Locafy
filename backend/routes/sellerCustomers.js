/**
 * routes/sellerCustomers.js
 * Seller xem và quản lý khách hàng đã liên hệ (từ Appointments + Conversations).
 * Mount: /api/seller/customers
 */
const express = require('express');
const router = express.Router();
const { Appointment, Conversation, Account } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');

function requireSeller(req, res, next) {
  if (req.user.role !== 'seller') {
    return res.status(403).json({ error: 'Chỉ seller mới có quyền truy cập.' });
  }
  next();
}

// ── GET / – Danh sách khách đã liên hệ (distinct users từ appointments + conversations) ──
// Query: page, limit
router.get('/', authMiddleware, requireSeller, async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    // Lấy danh sách userId unique đã đặt lịch với seller này
    const apptUserIds = await Appointment.distinct('user', { seller: sellerId });
    // Lấy danh sách userId unique đã nhắn tin với seller này
    const convUserIds = await Conversation.distinct('user', { seller: sellerId });

    // Hợp nhất
    const allUserIds = [...new Set([
      ...apptUserIds.map(String),
      ...convUserIds.map(String),
    ])];

    // Phân trang
    const skip = (Number(page) - 1) * Number(limit);
    const pageIds = allUserIds.slice(skip, skip + Number(limit));

    const users = await Account.find({ _id: { $in: pageIds } })
      .select('name email phone avatarUrl createdAt');

    // Gắn thêm thông tin tóm tắt (số lịch hẹn, lịch hẹn gần nhất)
    const enriched = await Promise.all(users.map(async (user) => {
      const [apptCount, lastAppt, convExists] = await Promise.all([
        Appointment.countDocuments({ seller: sellerId, user: user._id }),
        Appointment.findOne({ seller: sellerId, user: user._id }).sort({ scheduledAt: -1 }).select('status scheduledAt'),
        Conversation.findOne({ seller: sellerId, user: user._id }).select('_id lastMessage lastMessageAt'),
      ]);

      return {
        ...user.toObject(),
        appointmentCount: apptCount,
        lastAppointment: lastAppt || null,
        conversation: convExists || null,
      };
    }));

    res.status(200).json({
      ok: true,
      data: enriched,
      pagination: {
        total: allUserIds.length,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(allUserIds.length / Number(limit)),
      },
    });
  } catch (error) {
    console.error('GET /seller/customers error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /:userId – Xem chi tiết một khách hàng ───────────────────────────────
router.get('/:userId', authMiddleware, requireSeller, async (req, res) => {
  try {
    const { userId } = req.params;
    const sellerId = req.user.id;

    const user = await Account.findById(userId).select('name email phone avatarUrl createdAt');
    if (!user) return res.status(404).json({ error: 'Không tìm thấy khách hàng.' });

    const [appointments, conversation] = await Promise.all([
      Appointment.find({ seller: sellerId, user: userId })
        .populate('listing', 'title price imageUrls')
        .sort({ scheduledAt: -1 }),
      Conversation.findOne({ seller: sellerId, user: userId })
        .select('_id lastMessage lastMessageAt unreadBySeller'),
    ]);

    res.status(200).json({
      ok: true,
      data: { user, appointments, conversation: conversation || null },
    });
  } catch (error) {
    console.error('GET /seller/customers/:userId error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /appointments/:id/note – Seller ghi chú nội bộ cho lịch hẹn ────────
// Body: { sellerNote }
router.patch('/appointments/:id/note', authMiddleware, requireSeller, async (req, res) => {
  try {
    const { sellerNote } = req.body;
    if (sellerNote === undefined) {
      return res.status(400).json({ error: 'Thiếu sellerNote.' });
    }

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      seller: req.user.id,
    });
    if (!appointment) return res.status(404).json({ error: 'Không tìm thấy lịch hẹn.' });

    appointment.sellerNote = String(sellerNote).trim() || null;
    await appointment.save();

    res.status(200).json({ ok: true, data: appointment });
  } catch (error) {
    console.error('PATCH /seller/customers/appointments/:id/note error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
