const express = require('express');
const router = express.Router();
const { Account, UserPreference, ViewHistory, SellerProfile } = require('../models');
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

// ── User: lấy nhu cầu tìm trọ ────────────────────────────────────────────────
router.get('/preferences', authMiddleware, async (req, res) => {
  try {
    let pref = await UserPreference.findOne({ account: req.user.id });
    if (!pref) {
      pref = new UserPreference({ account: req.user.id });
      await pref.save();
    }
    res.status(200).json({ ok: true, data: pref });
  } catch (error) {
    console.error('GET /accounts/preferences error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── User: cập nhật nhu cầu tìm trọ ───────────────────────────────────────────
router.patch('/preferences', authMiddleware, async (req, res) => {
  try {
    const { school, preferredArea, minPrice, maxPrice, roomType, maxOccupants, moveInDate, desiredAmenities } = req.body;
    const updates = {
      school: school !== undefined ? school : null,
      preferredArea: preferredArea !== undefined ? preferredArea : null,
      minPrice: minPrice !== undefined ? Number(minPrice) : null,
      maxPrice: maxPrice !== undefined ? Number(maxPrice) : null,
      roomType: roomType !== undefined ? roomType : null,
      maxOccupants: maxOccupants !== undefined ? Number(maxOccupants) : null,
      moveInDate: moveInDate !== undefined ? moveInDate : null,
      desiredAmenities: desiredAmenities !== undefined ? desiredAmenities : []
    };

    const pref = await UserPreference.findOneAndUpdate(
      { account: req.user.id },
      { $set: updates },
      { new: true, upsert: true }
    );
    res.status(200).json({ ok: true, data: pref });
  } catch (error) {
    console.error('PATCH /accounts/preferences error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── User: lấy lịch sử phòng đã xem ───────────────────────────────────────────
router.get('/view-history', authMiddleware, async (req, res) => {
  try {
    const history = await ViewHistory.find({ user: req.user.id })
      .populate('listing')
      .sort({ viewedAt: -1 })
      .limit(50);

    const validHistory = history.filter(h => h.listing != null);
    res.status(200).json({ ok: true, data: validHistory });
  } catch (error) {
    console.error('GET /accounts/view-history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── Seller: lấy hồ sơ kinh doanh ─────────────────────────────────────────────
router.get('/seller-profile', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'seller') {
      return res.status(403).json({ error: 'Chỉ seller mới có hồ sơ kinh doanh.' });
    }
    let profile = await SellerProfile.findOne({ account: req.user.id });
    if (!profile) {
      profile = new SellerProfile({ account: req.user.id, sellerType: 'owner' });
      await profile.save();
    }
    res.status(200).json({ ok: true, data: profile });
  } catch (error) {
    console.error('GET /accounts/seller-profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── Seller: cập nhật hồ sơ kinh doanh ─────────────────────────────────────────
router.patch('/seller-profile', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'seller') {
      return res.status(403).json({ error: 'Chỉ seller mới có thể cập nhật hồ sơ kinh doanh.' });
    }
    const { sellerType, businessName, contactAddress, description } = req.body;
    const updates = {};
    if (sellerType !== undefined) updates.sellerType = sellerType;
    if (businessName !== undefined) updates.businessName = businessName;
    if (contactAddress !== undefined) updates.contactAddress = contactAddress;
    if (description !== undefined) updates.description = description;

    const profile = await SellerProfile.findOneAndUpdate(
      { account: req.user.id },
      { $set: updates },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ ok: true, data: profile });
  } catch (error) {
    console.error('PATCH /accounts/seller-profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── Seller: gửi hồ sơ xác minh ───────────────────────────────────────────────
router.post('/verify', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'seller') {
      return res.status(403).json({ error: 'Chỉ seller mới có thể gửi xác minh.' });
    }
    const { idCardFrontUrl, idCardBackUrl, propertyDocUrls, sellerType, contactAddress, businessName } = req.body;
    
    if (!idCardFrontUrl || !idCardBackUrl) {
      return res.status(400).json({ error: 'Thiếu ảnh CCCD mặt trước hoặc mặt sau.' });
    }

    const updates = {
      idCardFrontUrl,
      idCardBackUrl,
      verificationSubmittedAt: new Date()
    };
    if (propertyDocUrls !== undefined) updates.propertyDocUrls = propertyDocUrls;
    if (sellerType !== undefined) updates.sellerType = sellerType;
    if (contactAddress !== undefined) updates.contactAddress = contactAddress;
    if (businessName !== undefined) updates.businessName = businessName;

    // Cập nhật profile
    const profile = await SellerProfile.findOneAndUpdate(
      { account: req.user.id },
      { $set: updates },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Cập nhật trạng thái tài khoản
    await Account.findByIdAndUpdate(req.user.id, {
      $set: { verificationStatus: 'pending' }
    });

    res.status(200).json({ ok: true, message: 'Đã gửi hồ sơ xác minh, đang chờ duyệt.', data: profile });
  } catch (error) {
    console.error('POST /accounts/verify error:', error);
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
