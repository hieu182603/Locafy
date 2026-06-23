const express = require('express');
const router = express.Router();
const { Report } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');

// ── POST / – User/Seller tạo báo cáo vi phạm ────────────────────────────────
// Body: { entityType, entityId, reason, description?, evidenceUrls? }
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { entityType, entityId, reason, description, evidenceUrls } = req.body;

    if (!entityType || !entityId || !reason) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc: entityType, entityId, reason.' });
    }

    const validEntityTypes = ['listing', 'conversation', 'account'];
    if (!validEntityTypes.includes(entityType)) {
      return res.status(400).json({ error: `entityType phải là một trong: ${validEntityTypes.join(', ')}` });
    }

    const validReasons = ['spam', 'wrong_info', 'offensive', 'duplicate', 'fraud', 'other'];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ error: `reason phải là một trong: ${validReasons.join(', ')}` });
    }

    const report = new Report({
      reporter: req.user.id,
      entityType,
      entityId,
      reason,
      description: description || null,
      evidenceUrls: evidenceUrls || [],
      status: 'pending',
    });
    await report.save();

    res.status(201).json({ ok: true, data: report });
  } catch (error) {
    console.error('POST /reports error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET / – Admin xem tất cả báo cáo ────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ admin mới có quyền xem báo cáo.' });
    }

    const { status, entityType, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (entityType) filter.entityType = entityType;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Report.find(filter)
        .populate('reporter', 'name email role avatarUrl')
        .populate('resolvedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Report.countDocuments(filter)
    ]);

    res.status(200).json({
      ok: true,
      data: items,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    console.error('GET /reports error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /:id/resolve – Admin xử lý báo cáo ────────────────────────────────
// Body: { status: 'resolved' | 'dismissed' | 'reviewing', adminNote? }
router.patch('/:id/resolve', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ admin mới có quyền xử lý báo cáo.' });
    }

    const { status, adminNote } = req.body;
    const validStatuses = ['reviewing', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `status phải là một trong: ${validStatuses.join(', ')}` });
    }

    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Không tìm thấy báo cáo.' });

    report.status = status;
    report.adminNote = adminNote || null;
    if (['resolved', 'dismissed'].includes(status)) {
      report.resolvedBy = req.user.id;
      report.resolvedAt = new Date();
    }
    await report.save();

    res.status(200).json({ ok: true, data: report });
  } catch (error) {
    console.error('PATCH /reports/:id/resolve error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
