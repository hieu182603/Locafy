const makeCrudRouter = require('./crudFactory');
const Payment = require('../models/Payment');
const PayOS = require('@payos/node');

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
          const Notification = require('../models/Notification');
          const notifyRenter = new Notification({
            _id: `notif-${Date.now()}-renter`,
            title: 'Thanh toán tiền phòng thành công',
            description: `Hóa đơn "${payment.title}" trị giá ${payment.amount.toLocaleString('vi-VN')} VND đã thanh toán thành công qua cổng PayOS.`,
            type: 'payment',
            read: false,
            date: new Date().toISOString(),
            renterEmail: payment.tenantEmail
          });
          await notifyRenter.save();
        } catch (err) {
          console.error('Create payos webhook notification failed:', err);
        }
      }
    }
  } catch (error) {
    console.error('PayOS webhook validation/processing failed:', error);
  }
});

module.exports = router;
