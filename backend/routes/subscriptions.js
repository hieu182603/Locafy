const express = require('express');
const router = express.Router();
const { Subscription, Transaction, ServicePackage, Account } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');
const { createNotification } = require('./notifications');
const { getActiveSubscription } = require('../utils/subscriptionHelper');

// PayOS SDK – chỉ khởi tạo khi đã cấu hình
let payOS = null;
function getPayOS() {
  if (payOS) return payOS;
  const { PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY } = process.env;
  if (!PAYOS_CLIENT_ID || !PAYOS_API_KEY || !PAYOS_CHECKSUM_KEY) return null;
  const PayOS = require('@payos/node');
  payOS = new PayOS(PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY);
  return payOS;
}

// ── GET /my – Subscription đang active của account hiện tại ──────────────────
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const subscription = await getActiveSubscription(req.user.id)
      .populate('servicePackage')
      .sort({ createdAt: -1 });

    res.status(200).json({ ok: true, data: subscription || null });
  } catch (error) {
    console.error('GET /subscriptions/my error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /history – Lịch sử subscriptions ────────────────────────────────────
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

// ── POST /checkout – Tạo link thanh toán PayOS để mua / nâng cấp gói ─────────
// Body: { packageId, couponCode? }
// Trả về: { checkoutUrl, orderCode } để FE redirect sang PayOS
router.post('/checkout', authMiddleware, async (req, res) => {
  try {
    const { packageId, couponCode } = req.body;
    if (!packageId) return res.status(400).json({ error: 'Thiếu packageId.' });

    const pkg = await ServicePackage.findById(packageId);
    if (!pkg || !pkg.isActive) {
      return res.status(404).json({ error: 'Gói dịch vụ không tồn tại hoặc không còn hoạt động.' });
    }

    // Kiểm tra role hợp lệ
    const account = await Account.findById(req.user.id);
    if (pkg.targetRole !== account.role) {
      return res.status(400).json({ error: 'Gói này không dành cho role của bạn.' });
    }

    // Tính giá sau giảm
    let discountAmount = 0;
    // (TODO: tra cứu coupon từ DB nếu cần)
    const finalPrice = Math.max(0, pkg.price - discountAmount);

    // Gói miễn phí → kích hoạt ngay, không cần PayOS
    if (finalPrice === 0) {
      const result = await activateSubscription({
        accountId: req.user.id,
        pkg,
        transactionId: null,
        couponCode: couponCode || null,
        discountAmount,
        finalPrice: 0,
      });
      return res.status(200).json({ ok: true, free: true, data: result.subscription });
    }

    // Kiểm tra PayOS đã cấu hình chưa
    const client = getPayOS();
    if (!client) {
      return res.status(500).json({ error: 'Cổng thanh toán PayOS chưa được cấu hình.' });
    }

    // Tạo orderCode duy nhất (timestamp + 4 chữ số cuối accountId)
    const orderCode = Number(
      `${Date.now()}`.slice(-8) + String(req.user.id).slice(-4).replace(/\D/g, '0')
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Tạo Transaction (pending) trước khi redirect sang PayOS
    const transaction = new Transaction({
      account: req.user.id,
      servicePackage: pkg._id,
      amount: finalPrice,
      description: `Mua gói ${pkg.name}`,
      paymentGateway: 'payos',
      orderCode,
      couponCode: couponCode || null,
      discountAmount,
      status: 'pending',
    });
    await transaction.save();

    // Tạo payment link PayOS
    const paymentData = {
      orderCode,
      amount: finalPrice,
      description: `Locafy - ${pkg.name}`.slice(0, 25), // PayOS giới hạn 25 ký tự
      returnUrl: `${frontendUrl}/payment/success?orderCode=${orderCode}`,
      cancelUrl: `${frontendUrl}/payment/cancel?orderCode=${orderCode}`,
      items: [{ name: pkg.name, quantity: 1, price: finalPrice }],
    };

    const paymentLink = await client.createPaymentLink(paymentData);

    res.status(200).json({
      ok: true,
      checkoutUrl: paymentLink.checkoutUrl,
      orderCode,
      transactionId: transaction._id,
    });
  } catch (error) {
    console.error('POST /subscriptions/checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET / – Admin xem tất cả subscriptions ───────────────────────────────────
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
      Subscription.countDocuments(filter),
    ]);

    res.status(200).json({
      ok: true,
      data: items,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    console.error('GET /subscriptions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── Helper: kích hoạt Subscription sau khi thanh toán thành công ─────────────
async function activateSubscription({ accountId, pkg, transactionId, couponCode, discountAmount, finalPrice }) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + pkg.durationDays * 24 * 60 * 60 * 1000);

  // Hết hạn subscription cũ (nếu có)
  await Subscription.updateMany(
    { account: accountId, status: 'active' },
    { $set: { status: 'expired' } }
  );

  const subscription = new Subscription({
    account: accountId,
    servicePackage: pkg._id,
    transaction: transactionId,
    startedAt: now,
    expiresAt,
    status: 'active',
    remainingListings: pkg.maxListings,
    remainingBoostCredits: pkg.boostCredits || 0,
    remainingPinCredits: pkg.pinCredits || 0,
    remainingRefreshCredits: pkg.refreshCredits || 0,
    couponCode: couponCode || null,
    discountAmount: discountAmount || 0,
    finalPrice,
  });
  await subscription.save();

  // Gửi thông báo kích hoạt
  await createNotification({
    recipient: accountId,
    type: 'subscription_activated',
    title: `Gói ${pkg.name} đã được kích hoạt`,
    body: `Gói có hiệu lực đến ${expiresAt.toLocaleDateString('vi-VN')}.`,
    entityType: 'subscription',
    entityId: subscription._id,
  });

  return { subscription };
}

module.exports = router;
module.exports.activateSubscription = activateSubscription;
