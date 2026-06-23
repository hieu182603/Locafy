const express = require('express');
const router = express.Router();
const { SellerProfile, Account } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');

function requireSeller(req, res, next) {
  if (req.user.role !== 'seller') {
    return res.status(403).json({ error: 'Chỉ seller mới có quyền truy cập.' });
  }
  next();
}

// ── GET /api/seller/profile – Xem hồ sơ seller của mình ─────────────────────
router.get('/', authMiddleware, requireSeller, async (req, res) => {
  try {
    const profile = await SellerProfile.findOne({ account: req.user.id });
    const account = await Account.findById(req.user.id)
      .select('name email phone avatarUrl verificationStatus verificationRejectedReason isEmailVerified isPhoneVerified');

    res.status(200).json({ ok: true, data: { account, profile: profile || null } });
  } catch (error) {
    console.error('GET /seller/profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PUT /api/seller/profile – Cập nhật thông tin hồ sơ ──────────────────────
// Body: { sellerType, businessName, contactAddress, description }
router.put('/', authMiddleware, requireSeller, async (req, res) => {
  try {
    const { sellerType, businessName, contactAddress, description } = req.body;

    const SELLER_TYPES = ['owner', 'manager', 'broker'];
    if (sellerType && !SELLER_TYPES.includes(sellerType)) {
      return res.status(400).json({ error: `sellerType phải là một trong: ${SELLER_TYPES.join(', ')}` });
    }

    const updates = {};
    if (sellerType !== undefined)     updates.sellerType = sellerType;
    if (businessName !== undefined)   updates.businessName = String(businessName).trim() || null;
    if (contactAddress !== undefined) updates.contactAddress = String(contactAddress).trim() || null;
    if (description !== undefined)    updates.description = String(description).trim() || null;

    // Nếu chưa có sellerType (upsert lần đầu) thì cần bắt buộc
    const existing = await SellerProfile.findOne({ account: req.user.id });
    if (!existing && !sellerType) {
      return res.status(400).json({ error: 'Thiếu sellerType khi tạo hồ sơ lần đầu.' });
    }

    const profile = await SellerProfile.findOneAndUpdate(
      { account: req.user.id },
      { $set: updates },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ ok: true, data: profile });
  } catch (error) {
    console.error('PUT /seller/profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/seller/profile/submit-verification – Gửi hồ sơ xác minh ────────
// Body: { idCardFrontUrl, idCardBackUrl, propertyDocUrls: [] }
// Seller phải upload ảnh trước (qua /api/upload), rồi gửi URL vào đây
router.post('/submit-verification', authMiddleware, requireSeller, async (req, res) => {
  try {
    const account = await Account.findById(req.user.id);
    if (account.verificationStatus === 'approved') {
      return res.status(400).json({ error: 'Tài khoản đã được xác minh.' });
    }

    const { idCardFrontUrl, idCardBackUrl, propertyDocUrls } = req.body;
    if (!idCardFrontUrl || !idCardBackUrl) {
      return res.status(400).json({ error: 'Thiếu ảnh CCCD: idCardFrontUrl và idCardBackUrl.' });
    }

    // Upsert profile với thông tin giấy tờ
    const profile = await SellerProfile.findOneAndUpdate(
      { account: req.user.id },
      {
        $set: {
          idCardFrontUrl,
          idCardBackUrl,
          propertyDocUrls: Array.isArray(propertyDocUrls) ? propertyDocUrls : [],
          verificationSubmittedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Đặt verificationStatus về pending để Admin duyệt
    account.verificationStatus = 'pending';
    await account.save();

    res.status(200).json({
      ok: true,
      message: 'Hồ sơ xác minh đã được gửi. Vui lòng chờ Admin duyệt.',
      data: profile,
    });
  } catch (error) {
    console.error('POST /seller/profile/submit-verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/seller/profile/verification-status – Xem trạng thái xác minh ────
router.get('/verification-status', authMiddleware, requireSeller, async (req, res) => {
  try {
    const account = await Account.findById(req.user.id)
      .select('verificationStatus verificationRejectedReason');

    const profile = await SellerProfile.findOne({ account: req.user.id })
      .select('verificationSubmittedAt idCardFrontUrl idCardBackUrl propertyDocUrls');

    res.status(200).json({
      ok: true,
      data: {
        verificationStatus: account.verificationStatus,
        rejectedReason: account.verificationRejectedReason || null,
        submittedAt: profile?.verificationSubmittedAt || null,
        hasIdCard: !!(profile?.idCardFrontUrl && profile?.idCardBackUrl),
        hasPropertyDocs: (profile?.propertyDocUrls?.length || 0) > 0,
      },
    });
  } catch (error) {
    console.error('GET /seller/profile/verification-status error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
