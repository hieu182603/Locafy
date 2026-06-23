const makeCrudRouter = require('./crudFactory');
const Payment = require('../models/Payment');
const PayOS = require('@payos/node');
const { Account, ServicePackage, Transaction, Subscription, Notification } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');

const router = makeCrudRouter(Payment);

// Helper to safely fetch PayOS instance
let payosInstance = null;
function getPayOS() {
  if (payosInstance) return payosInstance;
  const clientId = process.env.PAYOS_CLIENT_ID;
  const apiKey = process.env.PAYOS_API_KEY;
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

  if (!clientId || !apiKey || !checksumKey || clientId === 'your_payos_client_id_here') {
    throw new Error('PayOS credentials are not properly configured in backend/.env.');
  }

  payosInstance = new PayOS(clientId, apiKey, checksumKey);
  return payosInstance;
}

// ── POST /buy-package: Tạo link thanh toán mua gói dịch vụ ────────────────────
router.post('/buy-package', authMiddleware, async (req, res) => {
  const { packageId } = req.body;
  if (!packageId) {
    return res.status(400).json({ error: 'Thiếu mã gói dịch vụ packageId.' });
  }

  try {
    const pkg = await ServicePackage.findById(packageId);
    if (!pkg) {
      return res.status(404).json({ error: 'Không tìm thấy gói dịch vụ.' });
    }

    if (pkg.price === 0) {
      // Free package: activate subscription directly
      await Subscription.updateMany(
        { account: req.user.id, status: 'active' },
        { $set: { status: 'expired' } }
      );

      const sub = new Subscription({
        account: req.user.id,
        servicePackage: pkg._id,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + pkg.durationDays * 24 * 3600 * 1000),
        status: 'active',
        remainingListings: pkg.maxListings,
        remainingBoostCredits: pkg.boostCredits,
        remainingPinCredits: pkg.pinCredits,
        remainingRefreshCredits: pkg.refreshCredits,
        finalPrice: 0
      });
      await sub.save();
      return res.status(200).json({ ok: true, message: 'Đăng ký gói miễn phí thành công.', activeSubscription: sub });
    }

    // Paid package: generate PayOS payment link
    let orderCode;
    let attempts = 0;
    while (attempts < 10) {
      orderCode = Math.floor(100000 + Math.random() * 900000) * 1000 + Math.floor(Math.random() * 1000);
      const existing = await Transaction.findOne({ orderCode });
      if (!existing) break;
      attempts++;
    }

    const txn = new Transaction({
      account: req.user.id,
      servicePackage: pkg._id,
      amount: pkg.price,
      orderCode,
      status: 'pending'
    });
    await txn.save();

    const cleanDescription = `Goi ${pkg.name} ${orderCode}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 25);
    const origin = req.headers.origin || 'http://localhost:5173';
    
    const isSeller = req.user.role === 'seller';
    const redirectTab = isSeller ? 'packages' : 'billing';
    const returnUrl = `${origin}/${isSeller ? 'manage' : 'user'}?tab=${redirectTab}&paymentStatus=success&orderCode=${orderCode}`;
    const cancelUrl = `${origin}/${isSeller ? 'manage' : 'user'}?tab=${redirectTab}&paymentStatus=cancel&orderCode=${orderCode}`;

    const payOSClient = getPayOS();
    const paymentData = {
      orderCode: orderCode,
      amount: Number(pkg.price),
      description: cleanDescription,
      items: [
        {
          name: pkg.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').substring(0, 20),
          quantity: 1,
          price: Number(pkg.price)
        }
      ],
      cancelUrl,
      returnUrl
    };

    const paymentLinkRes = await payOSClient.createPaymentLink(paymentData);

    res.status(200).json({
      ok: true,
      checkoutUrl: paymentLinkRes.checkoutUrl
    });
  } catch (error) {
    console.error('buyPackage error:', error);
    res.status(500).json({ error: error.message || 'Lỗi khởi tạo thanh toán gói dịch vụ.' });
  }
});

// 1. POST /payos-create: Tạo link thanh toán trực tuyến
router.post('/payos-create', async (req, res) => {
  const { paymentId } = req.body;
  if (!paymentId) {
    return res.status(400).json({ error: 'Thiếu mã hóa đơn paymentId.' });
  }

  try {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Không tìm thấy hóa đơn cần thanh toán.' });
    }

    if (payment.status === 'Đã thanh toán') {
      return res.status(400).json({ error: 'Hóa đơn này đã được thanh toán trước đó.' });
    }

    // Generate unique orderCode (required to be int32/int64 number)
    let orderCode = payment.orderCode;
    if (!orderCode) {
      let attempts = 0;
      while (attempts < 10) {
        orderCode = Math.floor(100000 + Math.random() * 900000) * 1000 + Math.floor(Math.random() * 1000);
        const existing = await Payment.findOne({ orderCode });
        if (!existing) break;
        attempts++;
      }
      payment.orderCode = orderCode;
      await payment.save();
    }

    // Prepare PayOS checkout data
    const cleanDescription = `Thanh toan Locafy ${orderCode}`.substring(0, 25);
    const origin = req.headers.origin || 'http://localhost:3000';
    const returnUrl = `${origin}/user?tab=payments&paymentStatus=success&paymentId=${paymentId}`;
    const cancelUrl = `${origin}/user?tab=payments&paymentStatus=cancel&paymentId=${paymentId}`;

    const payOSClient = getPayOS();
    const paymentData = {
      orderCode: orderCode,
      amount: Number(payment.amount),
      description: cleanDescription,
      items: [
        {
          name: (payment.roomTitle || 'Tien phong').normalize('NFD').replace(/[\u0300-\u036f]/g, '').substring(0, 20),
          quantity: 1,
          price: Number(payment.amount)
        }
      ],
      cancelUrl,
      returnUrl
    };

    const paymentLinkRes = await payOSClient.createPaymentLink(paymentData);

    res.status(200).json({
      ok: true,
      checkoutUrl: paymentLinkRes.checkoutUrl
    });
  } catch (error) {
    console.error('PayOS createPaymentLink error:', error);
    res.status(500).json({ error: error.message || 'Lỗi khởi tạo link thanh toán PayOS.' });
  }
});

// 2. POST /payos-webhook: Callback từ PayOS khi thanh toán thành công
router.post('/payos-webhook', async (req, res) => {
  const webhookBody = req.body;

  // Trả về phản hồi cho PayOS ngay lập tức để tránh timeout
  res.status(200).json({ ok: true });

  try {
    const payOSClient = getPayOS();
    // Xác minh chữ ký dữ liệu từ PayOS gửi sang
    const verifiedData = payOSClient.verifyPaymentWebhookData(webhookBody);

    if (webhookBody.code === '00' && verifiedData) {
      const orderCode = verifiedData.orderCode;
      const payment = await Payment.findOne({ orderCode });
      
      if (payment && payment.status !== 'Đã thanh toán') {
        payment.status = 'Đã thanh toán';
        payment.paymentMethod = 'PayOS';
        await payment.save();
        console.log(`Payment success via PayOS webhook for orderCode: ${orderCode}`);

        // Tự động tạo một thông báo hệ thống cho khách thuê
        try {
          const tenant = await Account.findOne({ email: payment.tenantEmail });
          if (tenant) {
            const notifyRenter = new Notification({
              recipient: tenant._id,
              title: 'Thanh toán tiền phòng thành công',
              body: `Hóa đơn "${payment.title}" trị giá ${payment.amount.toLocaleString('vi-VN')} VND đã thanh toán thành công qua cổng PayOS.`,
              type: 'payment_success'
            });
            await notifyRenter.save();
          }
        } catch (err) {
          console.error('Create payos webhook notification failed:', err);
        }
      } else {
        // Check if it's a Transaction (package purchase)
        const txn = await Transaction.findOne({ orderCode });
        if (txn && txn.status !== 'success') {
          txn.status = 'success';
          txn.paidAt = new Date();
          txn.paymentMethod = 'qr';
          txn.webhookData = verifiedData;
          await txn.save();
          console.log(`Transaction success via PayOS webhook for orderCode: ${orderCode}`);

          // Fetch the ServicePackage
          const pkg = await ServicePackage.findById(txn.servicePackage);
          if (pkg) {
            // Expire previous active subscriptions
            await Subscription.updateMany(
              { account: txn.account, status: 'active' },
              { $set: { status: 'expired' } }
            );

            // Create new Subscription
            const sub = new Subscription({
              account: txn.account,
              servicePackage: pkg._id,
              transaction: txn._id,
              startedAt: new Date(),
              expiresAt: new Date(Date.now() + pkg.durationDays * 24 * 3600 * 1000),
              status: 'active',
              remainingListings: pkg.maxListings,
              remainingBoostCredits: pkg.boostCredits,
              remainingPinCredits: pkg.pinCredits,
              remainingRefreshCredits: pkg.refreshCredits,
              finalPrice: txn.amount
            });
            await sub.save();

            // Create notification for active subscription
            try {
              const notify = new Notification({
                recipient: txn.account,
                title: 'Kích hoạt gói dịch vụ thành công',
                body: `Gói dịch vụ "${pkg.name}" đã được kích hoạt thành công. Hạn dùng đến ngày ${new Date(sub.expiresAt).toLocaleDateString('vi-VN')}.`,
                type: 'subscription_activated'
              });
              await notify.save();
            } catch (err) {
              console.error('Create subscription notification failed:', err);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('PayOS webhook validation/processing failed:', error);
  }
});

module.exports = router;
