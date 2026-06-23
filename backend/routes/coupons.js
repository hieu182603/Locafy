const express = require('express');
const router = express.Router();
const { Coupon, Transaction } = require('../models');
const adminMiddleware = require('../middlewares/adminMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');

// ── POST /validate – User/Seller kiểm tra mã giảm giá ────────────────────────
// Body: { code, packageId, packagePrice }
router.post('/validate', authMiddleware, async (req, res) => {
  try {
    const { code, packageId, packagePrice } = req.body;
    if (!code) return res.status(400).json({ error: 'Thiếu mã coupon.' });

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (!coupon) return res.status(404).json({ error: 'Mã giảm giá không tồn tại.' });
    if (!coupon.isActive) return res.status(400).json({ error: 'Mã giảm giá đã bị vô hiệu hóa.' });

    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) {
      return res.status(400).json({ error: 'Mã giảm giá chưa đến thời gian sử dụng.' });
    }
    if (coupon.expiresAt && now > coupon.expiresAt) {
      return res.status(400).json({ error: 'Mã giảm giá đã hết hạn.' });
    }
    if (coupon.maxUsageTotal !== null && coupon.usedCount >= coupon.maxUsageTotal) {
      return res.status(400).json({ error: 'Mã giảm giá đã hết lượt sử dụng.' });
    }

    // Kiểm tra giới hạn sử dụng theo user
    if (coupon.maxUsagePerUser > 0) {
      const userUsedCount = await Transaction.countDocuments({
        account: req.user.id,
        couponCode: coupon.code,
        status: 'success',
      });
      if (userUsedCount >= coupon.maxUsagePerUser) {
        return res.status(400).json({ error: 'Bạn đã sử dụng hết lượt dùng mã này.' });
      }
    }

    // Kiểm tra gói áp dụng
    if (coupon.applicablePackages.length > 0 && packageId) {
      const applicable = coupon.applicablePackages.map(String).includes(String(packageId));
      if (!applicable) {
        return res.status(400).json({ error: 'Mã giảm giá không áp dụng cho gói này.' });
      }
    }

    // Kiểm tra giá tối thiểu
    const price = packagePrice ? Number(packagePrice) : 0;
    if (price < coupon.minOrderAmount) {
      return res.status(400).json({
        error: `Giá trị đơn hàng tối thiểu để dùng mã là ${coupon.minOrderAmount.toLocaleString('vi-VN')} VND.`,
      });
    }

    // Tính tiền giảm
    let discountAmount = 0;
    if (coupon.discountType === 'percent') {
      discountAmount = Math.floor((price * coupon.discountValue) / 100);
      if (coupon.maxDiscount !== null) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      }
    } else {
      discountAmount = coupon.discountValue;
    }
    discountAmount = Math.min(discountAmount, price); // không giảm vượt giá gói

    res.status(200).json({
      ok: true,
      data: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        finalPrice: price - discountAmount,
        description: coupon.description,
      },
    });
  } catch (error) {
    console.error('POST /coupons/validate error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET / – Admin xem tất cả coupon ─────────────────────────────────────────
router.get('/', adminMiddleware, async (req, res) => {
  try {
    const { isActive, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Coupon.find(filter)
        .populate('applicablePackages', 'name code')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Coupon.countDocuments(filter),
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
    console.error('GET /coupons error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /:id – Admin xem chi tiết coupon ─────────────────────────────────────
router.get('/:id', adminMiddleware, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
      .populate('applicablePackages', 'name code price')
      .populate('createdBy', 'name email');

    if (!coupon) return res.status(404).json({ error: 'Không tìm thấy coupon.' });
    res.status(200).json({ ok: true, data: coupon });
  } catch (error) {
    console.error('GET /coupons/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST / – Admin tạo coupon mới ────────────────────────────────────────────
// Body: { code, discountType, discountValue, maxDiscount?, applicablePackages?, minOrderAmount?, maxUsageTotal?, maxUsagePerUser?, isActive?, startsAt?, expiresAt?, description? }
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const {
      code, discountType, discountValue,
      maxDiscount, applicablePackages,
      minOrderAmount, maxUsageTotal, maxUsagePerUser,
      isActive, startsAt, expiresAt, description,
    } = req.body;

    if (!code || !discountType || discountValue === undefined) {
      return res.status(400).json({ error: 'Thiếu code, discountType hoặc discountValue.' });
    }

    const existing = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (existing) return res.status(409).json({ error: 'Mã coupon đã tồn tại.' });

    const coupon = new Coupon({
      code: code.toUpperCase().trim(),
      discountType,
      discountValue: Number(discountValue),
      maxDiscount: maxDiscount !== undefined ? Number(maxDiscount) : null,
      applicablePackages: applicablePackages || [],
      minOrderAmount: minOrderAmount !== undefined ? Number(minOrderAmount) : 0,
      maxUsageTotal: maxUsageTotal !== undefined ? Number(maxUsageTotal) : null,
      maxUsagePerUser: maxUsagePerUser !== undefined ? Number(maxUsagePerUser) : 1,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      startsAt: startsAt || null,
      expiresAt: expiresAt || null,
      description: description || null,
      createdBy: req.user.id,
    });
    await coupon.save();

    res.status(201).json({ ok: true, data: coupon });
  } catch (error) {
    console.error('POST /coupons error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /:id – Admin cập nhật coupon ───────────────────────────────────────
router.patch('/:id', adminMiddleware, async (req, res) => {
  try {
    const allowedFields = [
      'discountType', 'discountValue', 'maxDiscount', 'applicablePackages',
      'minOrderAmount', 'maxUsageTotal', 'maxUsagePerUser',
      'isActive', 'startsAt', 'expiresAt', 'description',
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    );
    if (!coupon) return res.status(404).json({ error: 'Không tìm thấy coupon.' });

    res.status(200).json({ ok: true, data: coupon });
  } catch (error) {
    console.error('PATCH /coupons/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── DELETE /:id – Admin xóa coupon ───────────────────────────────────────────
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ error: 'Không tìm thấy coupon.' });

    res.status(200).json({ ok: true, message: 'Coupon đã được xóa.' });
  } catch (error) {
    console.error('DELETE /coupons/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
