const express = require('express');
const router = express.Router();
const { Account } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');

// ── Admin: lấy tất cả accounts ───────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ admin mới có quyền truy cập.' });
    }
    const accounts = await Account.find({})
      .select('-password -passwordResetToken -passwordResetExpires')
      .sort({ createdAt: -1 });
    res.status(200).json({ ok: true, data: accounts });
  } catch (error) {
    console.error('GET /accounts error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── User: xem profile của mình ───────────────────────────────────────────────
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await Account.findById(req.user.id)
      .select('-password -passwordResetToken -passwordResetExpires');
    if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
    res.status(200).json({ ok: true, data: user });
  } catch (error) {
    console.error('GET /accounts/profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── User: cập nhật profile ───────────────────────────────────────────────────
router.patch('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, phone, avatarUrl } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (phone !== undefined) updates.phone = String(phone).trim();
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

    // Cập nhật isProfileComplete nếu đã có đủ thông tin
    const user = await Account.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });

    const updatedPhone = phone !== undefined ? String(phone).trim() : user.phone;
    if (updatedPhone) updates.isProfileComplete = true;

    const updated = await Account.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true }
    ).select('-password -passwordResetToken -passwordResetExpires');

    res.status(200).json({ ok: true, data: updated });
  } catch (error) {
    console.error('PATCH /accounts/profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── Admin: khóa / mở khóa tài khoản ─────────────────────────────────────────
router.patch('/:id/toggle-active', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ admin mới có quyền thực hiện.' });
    }
    const account = await Account.findById(req.params.id);
    if (!account) return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });

    account.isActive = !account.isActive;
    await account.save();

    res.status(200).json({
      ok: true,
      message: account.isActive ? 'Tài khoản đã được mở khóa.' : 'Tài khoản đã bị khóa.',
      isActive: account.isActive
    });
  } catch (error) {
    console.error('PATCH /accounts/:id/toggle-active error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── Admin: duyệt / từ chối seller ────────────────────────────────────────────
// Body: { status: 'approved' | 'rejected', rejectedReason?: string }
router.patch('/:id/verify', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ admin mới có quyền thực hiện.' });
    }
    const { status, rejectedReason } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status phải là "approved" hoặc "rejected".' });
    }

    const account = await Account.findById(req.params.id);
    if (!account) return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
    if (account.role !== 'seller') {
      return res.status(400).json({ error: 'Chỉ có thể xác minh tài khoản seller.' });
    }

    account.verificationStatus = status;
    account.verificationRejectedReason = status === 'rejected' ? (rejectedReason || null) : null;
    await account.save();

    res.status(200).json({
      ok: true,
      message: status === 'approved' ? 'Seller đã được duyệt.' : 'Seller đã bị từ chối.',
      verificationStatus: account.verificationStatus
    });
  } catch (error) {
    console.error('PATCH /accounts/:id/verify error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
