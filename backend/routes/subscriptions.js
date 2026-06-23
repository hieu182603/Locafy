const express = require('express');
const router = express.Router();
const { Subscription } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');

// ── GET /my – Subscription active của user/seller hiện tại ──────────────────
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      account: req.user.id,
      status: 'active',
    })
      .populate('servicePackage')
      .sort({ createdAt: -1 });

    res.status(200).json({ ok: true, data: subscription || null });
  } catch (error) {
    console.error('GET /subscriptions/my error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /history – Lịch sử subscriptions của user/seller ────────────────────
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ account: req.user.id })
      .populate('servicePackage', 'name code price durationDays targetRole')
      .sort({ createdAt: -1 });

    res.status(200).json({ ok: true, data: subscriptions });
  } catch (error) {
    console.error('GET /subscriptions/history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET / – Admin xem tất cả subscriptions ──────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ admin mới có thể truy cập.' });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Subscription.find(filter)
        .populate('account', 'name email role')
        .populate('servicePackage', 'name code targetRole')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Subscription.countDocuments(filter)
    ]);

    res.status(200).json({
      ok: true,
      data: items,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    console.error('GET /subscriptions error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
