const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const adminMiddleware = require('../middlewares/adminMiddleware');
const {
  Account,
  Listing,
  Transaction,
  Subscription,
  ServicePackage,
  Report,
  SellerProfile,
} = require('../models');

// ── GET /dashboard – Thống kê tổng quan hệ thống ─────────────────────────────
router.get('/dashboard', adminMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      totalUsers,
      totalSellers,
      pendingSellers,
      totalListings,
      pendingListings,
      approvedListings,
      totalTransactions,
      revenueThisMonth,
      revenueLastMonth,
      pendingReports,
      newUsersThisMonth,
      newSellersThisMonth,
    ] = await Promise.all([
      Account.countDocuments({ role: 'user' }),
      Account.countDocuments({ role: 'seller' }),
      Account.countDocuments({ role: 'seller', verificationStatus: 'pending' }),
      Listing.countDocuments({ status: { $ne: 'deleted' } }),
      Listing.countDocuments({ status: 'pending' }),
      Listing.countDocuments({ status: 'approved' }),
      Transaction.countDocuments({ status: 'success' }),
      Transaction.aggregate([
        { $match: { status: 'success', paidAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        { $match: { status: 'success', paidAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Report.countDocuments({ status: 'pending' }),
      Account.countDocuments({ role: 'user', createdAt: { $gte: startOfMonth } }),
      Account.countDocuments({ role: 'seller', createdAt: { $gte: startOfMonth } }),
    ]);

    const thisMonthRevenue = revenueThisMonth[0]?.total || 0;
    const lastMonthRevenue = revenueLastMonth[0]?.total || 0;
    const revenueGrowth = lastMonthRevenue > 0
      ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
      : null;

    res.status(200).json({
      ok: true,
      data: {
        accounts: {
          totalUsers,
          totalSellers,
          pendingSellers,
          newUsersThisMonth,
          newSellersThisMonth,
        },
        listings: {
          total: totalListings,
          pending: pendingListings,
          approved: approvedListings,
        },
        transactions: {
          totalSuccessful: totalTransactions,
          revenueThisMonth: thisMonthRevenue,
          revenueLastMonth: lastMonthRevenue,
          revenueGrowth: revenueGrowth ? Number(revenueGrowth) : null,
        },
        reports: {
          pending: pendingReports,
        },
      },
    });
  } catch (error) {
    console.error('GET /admin/dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /revenue – Báo cáo doanh thu theo ngày/tháng/năm ─────────────────────
// Query: period = 'daily' | 'monthly' | 'yearly', year?, month?
router.get('/revenue', adminMiddleware, async (req, res) => {
  try {
    const { period = 'monthly', year, month } = req.query;
    const now = new Date();
    const y = year ? Number(year) : now.getFullYear();

    let matchStage = { status: 'success' };
    let groupStage;

    if (period === 'daily') {
      const m = month ? Number(month) - 1 : now.getMonth();
      matchStage.paidAt = {
        $gte: new Date(y, m, 1),
        $lte: new Date(y, m + 1, 0, 23, 59, 59),
      };
      groupStage = {
        _id: { day: { $dayOfMonth: '$paidAt' } },
        revenue: { $sum: '$amount' },
        count: { $sum: 1 },
      };
    } else if (period === 'monthly') {
      matchStage.paidAt = {
        $gte: new Date(y, 0, 1),
        $lte: new Date(y, 11, 31, 23, 59, 59),
      };
      groupStage = {
        _id: { month: { $month: '$paidAt' } },
        revenue: { $sum: '$amount' },
        count: { $sum: 1 },
      };
    } else {
      // yearly – 5 năm gần nhất
      matchStage.paidAt = {
        $gte: new Date(y - 4, 0, 1),
        $lte: new Date(y, 11, 31, 23, 59, 59),
      };
      groupStage = {
        _id: { year: { $year: '$paidAt' } },
        revenue: { $sum: '$amount' },
        count: { $sum: 1 },
      };
    }

    const data = await Transaction.aggregate([
      { $match: matchStage },
      { $group: groupStage },
      { $sort: { '_id': 1 } },
    ]);

    // Tổng doanh thu toàn bộ thời gian
    const [totalAllTime] = await Transaction.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      ok: true,
      data,
      summary: {
        totalAllTime: totalAllTime?.total || 0,
        totalTransactions: totalAllTime?.count || 0,
      },
    });
  } catch (error) {
    console.error('GET /admin/revenue error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /listings – Admin xem tất cả listings với filter đầy đủ ──────────────
// Query: status (pending|approved|rejected|hidden|deleted), page, limit
router.get('/listings', adminMiddleware, async (req, res) => {
  try {
    const { status, sellerId, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (sellerId) filter.seller = sellerId;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      require('../models').Listing.find(filter)
        .populate('seller', 'name email phone verificationStatus')
        .populate('property', 'name addressLine district province')
        .populate('reviewedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      require('../models').Listing.countDocuments(filter),
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
    console.error('GET /admin/listings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /accounts – Admin xem tài khoản với filter nâng cao ──────────────────
// Query: role, isActive, verificationStatus, keyword, page, limit
router.get('/accounts', adminMiddleware, async (req, res) => {
  try {
    const { role, isActive, verificationStatus, keyword, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (verificationStatus) filter.verificationStatus = verificationStatus;
    if (keyword) {
      filter.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { email: { $regex: keyword, $options: 'i' } },
        { phone: { $regex: keyword, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Account.find(filter)
        .select('-password -passwordResetToken -passwordResetExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Account.countDocuments(filter),
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
    console.error('GET /admin/accounts error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /accounts/:id – Admin xem chi tiết một tài khoản ─────────────────────
router.get('/accounts/:id', adminMiddleware, async (req, res) => {
  try {
    const account = await Account.findById(req.params.id)
      .select('-password -passwordResetToken -passwordResetExpires');
    if (!account) return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });

    let extra = {};
    if (account.role === 'seller') {
      const profile = await SellerProfile.findOne({ account: account._id });
      extra.sellerProfile = profile || null;

      const listingCount = await require('../models').Listing.countDocuments({
        seller: account._id,
        status: { $ne: 'deleted' },
      });
      extra.listingCount = listingCount;
    }

    res.status(200).json({ ok: true, data: { ...account.toObject(), ...extra } });
  } catch (error) {
    console.error('GET /admin/accounts/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /transactions/:id/refund – Admin hoàn tiền ──────────────────────────
// Body: { refundAmount, refundReason }
router.post('/transactions/:id/refund', adminMiddleware, async (req, res) => {
  try {
    const { refundAmount, refundReason } = req.body;
    if (!refundAmount || Number(refundAmount) <= 0) {
      return res.status(400).json({ error: 'refundAmount phải lớn hơn 0.' });
    }

    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ error: 'Không tìm thấy giao dịch.' });
    if (transaction.status !== 'success') {
      return res.status(400).json({ error: 'Chỉ có thể hoàn tiền giao dịch đã thanh toán thành công.' });
    }
    if (Number(refundAmount) > transaction.amount) {
      return res.status(400).json({ error: 'Số tiền hoàn không được vượt quá số tiền giao dịch.' });
    }

    transaction.status = 'refunded';
    transaction.refundAmount = Number(refundAmount);
    transaction.refundReason = refundReason || null;
    transaction.refundedAt = new Date();
    await transaction.save();

    // Thu hồi subscription tương ứng (nếu còn active)
    await Subscription.updateMany(
      { transaction: transaction._id, status: 'active' },
      { $set: { status: 'expired' } }
    );

    res.status(200).json({
      ok: true,
      message: 'Hoàn tiền thành công.',
      data: transaction,
    });
  } catch (error) {
    console.error('POST /admin/transactions/:id/refund error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /transactions – Admin xem giao dịch với filter nâng cao ──────────────
// Query: status, role (user|seller), fromDate, toDate, page, limit
router.get('/transactions', adminMiddleware, async (req, res) => {
  try {
    const { status, fromDate, toDate, accountId, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (accountId) filter.account = accountId;
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(new Date(toDate).setHours(23, 59, 59));
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Transaction.find(filter)
        .populate('account', 'name email role')
        .populate('servicePackage', 'name code targetRole price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Transaction.countDocuments(filter),
    ]);

    // Tổng tiền theo filter hiện tại (chỉ success)
    const [summary] = await Transaction.aggregate([
      { $match: { ...filter, status: 'success' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' }, count: { $sum: 1 } } },
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
      summary: {
        totalRevenue: summary?.totalRevenue || 0,
        successCount: summary?.count || 0,
      },
    });
  } catch (error) {
    console.error('GET /admin/transactions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /subscriptions – Admin xem subscriptions với filter ──────────────────
router.get('/subscriptions', adminMiddleware, async (req, res) => {
  try {
    const { status, accountId, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (accountId) filter.account = accountId;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Subscription.find(filter)
        .populate('account', 'name email role')
        .populate('servicePackage', 'name code targetRole price durationDays')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Subscription.countDocuments(filter),
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
    console.error('GET /admin/subscriptions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /subscriptions/:id/expire – Admin thu hồi subscription ─────────────
router.patch('/subscriptions/:id/expire', adminMiddleware, async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Không tìm thấy subscription.' });

    sub.status = 'expired';
    await sub.save();

    res.status(200).json({ ok: true, message: 'Subscription đã bị thu hồi.', data: sub });
  } catch (error) {
    console.error('PATCH /admin/subscriptions/:id/expire error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
