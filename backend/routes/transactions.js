const express = require('express');
const router = express.Router();
const { Transaction } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');

// ── GET /my – Transactions của account hiện tại ──────────────────────────────
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { account: req.user.id };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Transaction.find(filter)
        .populate('servicePackage', 'name code price targetRole')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Transaction.countDocuments(filter)
    ]);

    res.status(200).json({
      ok: true,
      data: items,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    console.error('GET /transactions/my error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET / – Admin xem tất cả transactions ───────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ admin mới có quyền truy cập.' });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Transaction.find(filter)
        .populate('account', 'name email role')
        .populate('servicePackage', 'name code targetRole')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Transaction.countDocuments(filter)
    ]);

    res.status(200).json({
      ok: true,
      data: items,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    console.error('GET /transactions error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
