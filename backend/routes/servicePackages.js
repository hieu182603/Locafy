const express = require('express');
const router = express.Router();
const { ServicePackage } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');

// ── GET / – Public: danh sách tất cả gói dịch vụ đang hoạt động ─────────────
router.get('/', async (req, res) => {
  try {
    const { targetRole } = req.query;
    const filter = { isActive: true };
    if (targetRole) filter.targetRole = targetRole;

    const packages = await ServicePackage.find(filter).sort({ targetRole: 1, sortOrder: 1 });
    res.status(200).json({ ok: true, data: packages });
  } catch (error) {
    console.error('GET /service-packages error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /:id – Public: chi tiết một gói ─────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const pkg = await ServicePackage.findById(req.params.id);
    if (!pkg) return res.status(404).json({ error: 'Không tìm thấy gói dịch vụ.' });
    res.status(200).json({ ok: true, data: pkg });
  } catch (error) {
    console.error('GET /service-packages/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST / – Admin tạo gói mới ───────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ admin mới có quyền tạo gói dịch vụ.' });
    }
    const pkg = new ServicePackage(req.body);
    await pkg.save();
    res.status(201).json({ ok: true, data: pkg });
  } catch (error) {
    console.error('POST /service-packages error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /:id – Admin cập nhật gói ─────────────────────────────────────────
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ admin mới có quyền chỉnh sửa gói dịch vụ.' });
    }
    const updated = await ServicePackage.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy gói dịch vụ.' });
    res.status(200).json({ ok: true, data: updated });
  } catch (error) {
    console.error('PATCH /service-packages/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
