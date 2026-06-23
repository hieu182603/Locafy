const express = require('express');
const router = express.Router();
const { Transaction, ServicePackage } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');
const { activateSubscription } = require('./subscriptions');

// ── GET /my – Lịch sử giao dịch của account hiện tại ─────────────────────────
// Query: status, page, limit
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { account: req.user.id };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Transaction.find(filter)
        .populate('servicePackage', 'name code price targetRole durationDays')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Transaction.countDocuments(filter),
    ]);

    res.status(200).json({
      ok: true,
      data: items,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    console.error('GET /transactions/my error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /my/:id/invoice – Xem hóa đơn chi tiết một giao dịch ────────────────
router.get('/my/:id/invoice', authMiddleware, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, account: req.user.id })
      .populate('account', 'name email phone')
      .populate('servicePackage', 'name code price durationDays targetRole description');

    if (!transaction) return res.status(404).json({ error: 'Không tìm thấy giao dịch.' });

    res.status(200).json({
      ok: true,
      data: {
        invoiceNo: `INV-${String(transaction._id).slice(-8).toUpperCase()}`,
        issuedAt: transaction.paidAt || transaction.createdAt,
        customer: transaction.account,
        package: transaction.servicePackage,
        amount: transaction.amount,
        discountAmount: transaction.discountAmount || 0,
        finalAmount: transaction.amount,
        couponCode: transaction.couponCode || null,
        paymentGateway: transaction.paymentGateway,
        paymentMethod: transaction.paymentMethod,
        orderCode: transaction.orderCode,
        status: transaction.status,
        paidAt: transaction.paidAt,
      },
    });
  } catch (error) {
    console.error('GET /transactions/my/:id/invoice error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /webhook/payos – PayOS gọi về sau khi thanh toán ────────────────────
// Không cần auth (PayOS gọi từ server của họ)
// Body theo chuẩn PayOS webhook
router.post('/webhook/payos', async (req, res) => {
  try {
    const { PAYOS_CHECKSUM_KEY } = process.env;

    // Xác thực chữ ký PayOS (nếu đã có key)
    if (PAYOS_CHECKSUM_KEY) {
      const PayOS = require('@payos/node');
      const client = new PayOS(
        process.env.PAYOS_CLIENT_ID,
        process.env.PAYOS_API_KEY,
        PAYOS_CHECKSUM_KEY
      );
      try {
        client.verifyPaymentWebhookData(req.body);
      } catch (sigErr) {
        console.warn('PayOS webhook signature invalid:', sigErr.message);
        return res.status(400).json({ error: 'Chữ ký webhook không hợp lệ.' });
      }
    }

    const { data, code } = req.body;
    if (!data) return res.status(400).json({ error: 'Thiếu data.' });

    const { orderCode, status: payosStatus, amount } = data;

    const transaction = await Transaction.findOne({ orderCode: Number(orderCode) });
    if (!transaction) {
      console.warn(`Webhook: không tìm thấy transaction với orderCode=${orderCode}`);
      return res.status(200).json({ ok: true }); // Trả 200 để PayOS không retry
    }

    // Lưu raw webhook
    transaction.webhookData = req.body;

    if (payosStatus === 'PAID' || code === '00') {
      if (transaction.status === 'success') {
        // Đã xử lý trước đó → idempotent
        return res.status(200).json({ ok: true });
      }

      transaction.status = 'success';
      transaction.paidAt = new Date();
      transaction.gatewayTransactionId = data.transactionDateTime || null;
      transaction.paymentMethod = data.paymentMethod?.toLowerCase() || 'bank_transfer';
      await transaction.save();

      // Kích hoạt gói
      const pkg = await ServicePackage.findById(transaction.servicePackage);
      if (pkg) {
        await activateSubscription({
          accountId: transaction.account,
          pkg,
          transactionId: transaction._id,
          couponCode: transaction.couponCode,
          discountAmount: transaction.discountAmount,
          finalPrice: transaction.amount,
        });
      }
    } else if (['CANCELLED', 'EXPIRED'].includes(payosStatus)) {
      transaction.status = 'cancelled';
      await transaction.save();
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('PayOS webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET / – Admin xem tất cả giao dịch ───────────────────────────────────────
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
      Transaction.countDocuments(filter),
    ]);

    res.status(200).json({
      ok: true,
      data: items,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    console.error('GET /transactions error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
