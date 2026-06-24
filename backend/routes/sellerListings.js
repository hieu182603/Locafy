/**
 * routes/sellerListings.js
 * Seller quản lý tin đăng của mình.
 * Mount: /api/seller/listings
 *
 * Không trùng với /api/listings (public + admin).
 */
const express = require('express');
const router = express.Router();
const { Listing, Room, Property, Subscription } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');
const { createNotification } = require('./notifications');
const { getActiveSubscription } = require('../utils/subscriptionHelper');

function requireSeller(req, res, next) {
  if (req.user.role !== 'seller') {
    return res.status(403).json({ error: 'Chỉ seller mới có quyền truy cập.' });
  }
  next();
}

// ── GET / – Seller xem tất cả tin đăng của mình ──────────────────────────────
// Query: status (draft|pending|approved|rejected|hidden|expired|deleted), page, limit
router.get('/', authMiddleware, requireSeller, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { seller: req.user.id };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Listing.find(filter)
        .populate('room', 'name roomType area price imageUrls')
        .populate('property', 'name addressLine district province')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Listing.countDocuments(filter),
    ]);

    res.status(200).json({
      ok: true,
      data: items,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    console.error('GET /seller/listings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /stats – Thống kê nhanh cho dashboard ─────────────────────────────────
router.get('/stats', authMiddleware, requireSeller, async (req, res) => {
  try {
    const sellerId = req.user.id;

    const [
      totalListings,
      pendingCount,
      approvedCount,
      rejectedCount,
      totalViews,
      totalContacts,
      totalAppointments,
    ] = await Promise.all([
      Listing.countDocuments({ seller: sellerId, status: { $nin: ['deleted'] } }),
      Listing.countDocuments({ seller: sellerId, status: 'pending' }),
      Listing.countDocuments({ seller: sellerId, status: 'approved' }),
      Listing.countDocuments({ seller: sellerId, status: 'rejected' }),
      Listing.aggregate([
        { $match: { seller: sellerId } },
        { $group: { _id: null, total: { $sum: '$viewCount' } } },
      ]),
      Listing.aggregate([
        { $match: { seller: sellerId } },
        { $group: { _id: null, total: { $sum: '$contactCount' } } },
      ]),
      Listing.aggregate([
        { $match: { seller: sellerId } },
        { $group: { _id: null, total: { $sum: '$appointmentCount' } } },
      ]),
    ]);

    res.status(200).json({
      ok: true,
      data: {
        totalListings,
        pendingCount,
        approvedCount,
        rejectedCount,
        totalViews: totalViews[0]?.total || 0,
        totalContacts: totalContacts[0]?.total || 0,
        totalAppointments: totalAppointments[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error('GET /seller/listings/stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /:id – Chi tiết một tin đăng (chỉ seller sở hữu) ─────────────────────
router.get('/:id', authMiddleware, requireSeller, async (req, res) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, seller: req.user.id })
      .populate('room')
      .populate('property');
    if (!listing) return res.status(404).json({ error: 'Không tìm thấy tin đăng.' });

    res.status(200).json({ ok: true, data: listing });
  } catch (error) {
    console.error('GET /seller/listings/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST / – Tạo tin đăng mới (lưu nháp hoặc gửi duyệt) ─────────────────────
// Body: { roomId, title, description, imageUrls, videoUrl, availableFrom,
//         asDraft: true|false }
// Snapshot giá/diện tích/địa chỉ lấy từ Room + Property
router.post('/', authMiddleware, requireSeller, async (req, res) => {
  try {
    // Kiểm tra seller đã được xác minh chưa
    const { Account } = require('../models');
    const account = await Account.findById(req.user.id).select('verificationStatus');
    if (account.verificationStatus !== 'approved') {
      return res.status(403).json({
        error: 'Seller chưa được xác minh. Vui lòng hoàn thành xác minh trước khi đăng tin.',
      });
    }

    const { roomId, title, description, imageUrls, videoUrl, availableFrom, asDraft = false } = req.body;

    if (!roomId || !title) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc: roomId, title.' });
    }

    // Lấy thông tin phòng và nhà trọ để snapshot
    const room = await Room.findById(roomId).populate('property');
    if (!room) return res.status(404).json({ error: 'Không tìm thấy phòng.' });
    if (String(room.seller) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Phòng này không thuộc về bạn.' });
    }

    const property = room.property;

    // Kiểm tra hạn mức listing theo gói (chỉ khi gửi duyệt, không phải nháp)
    if (!asDraft) {
      const sub = await getActiveSubscription(req.user.id);
      if (sub && sub.remainingListings !== null && sub.remainingListings <= 0) {
        return res.status(403).json({
          error: 'Bạn đã hết hạn mức tin đăng. Vui lòng nâng cấp gói dịch vụ.',
        });
      }
    }

    const listing = new Listing({
      room: roomId,
      property: property._id,
      seller: req.user.id,
      title,
      description: description || null,
      // Snapshot từ Room
      price: room.price,
      deposit: room.deposit,
      area: room.area,
      roomType: room.roomType,
      amenities: room.amenities,
      imageUrls: imageUrls || room.imageUrls,
      videoUrl: videoUrl || room.videoUrl || null,
      availableFrom: availableFrom ? new Date(availableFrom) : null,
      // Snapshot địa chỉ từ Property
      addressLine: property.addressLine,
      ward: property.ward,
      district: property.district,
      province: property.province,
      location: property.location,
      status: asDraft ? 'draft' : 'pending',
    });
    await listing.save();

    // Trừ hạn mức nếu gửi duyệt
    if (!asDraft) {
      await Subscription.findOneAndUpdate(
        { account: req.user.id, status: 'active', remainingListings: { $gt: 0 } },
        { $inc: { remainingListings: -1 } }
      );
    }

    res.status(201).json({ ok: true, data: listing });
  } catch (error) {
    console.error('POST /seller/listings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /:id – Sửa nội dung tin (tự động về pending nếu đang approved/rejected) ─
router.patch('/:id', authMiddleware, requireSeller, async (req, res) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, seller: req.user.id });
    if (!listing) return res.status(404).json({ error: 'Không tìm thấy tin đăng.' });

    if (['deleted', 'expired'].includes(listing.status)) {
      return res.status(400).json({ error: 'Không thể chỉnh sửa tin đã xóa hoặc hết hạn.' });
    }

    const allowedFields = ['title', 'description', 'imageUrls', 'videoUrl', 'availableFrom'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    // Nếu đang approved/rejected/hidden → về pending khi chỉnh sửa (cần duyệt lại)
    if (['approved', 'rejected', 'hidden'].includes(listing.status) && Object.keys(updates).length > 0) {
      updates.status = 'pending';
    }

    const updated = await Listing.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    res.status(200).json({ ok: true, data: updated });
  } catch (error) {
    console.error('PATCH /seller/listings/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /:id/submit – Gửi nháp lên để Admin duyệt ────────────────────────
router.patch('/:id/submit', authMiddleware, requireSeller, async (req, res) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, seller: req.user.id });
    if (!listing) return res.status(404).json({ error: 'Không tìm thấy tin đăng.' });

    if (!['draft', 'rejected'].includes(listing.status)) {
      return res.status(400).json({ error: 'Chỉ có thể gửi duyệt tin ở trạng thái nháp hoặc bị từ chối.' });
    }

    // Kiểm tra hạn mức (chỉ lần đầu từ draft)
    if (listing.status === 'draft') {
      const sub = await getActiveSubscription(req.user.id);
      if (sub && sub.remainingListings !== null && sub.remainingListings <= 0) {
        return res.status(403).json({ error: 'Đã hết hạn mức tin đăng. Vui lòng nâng cấp gói.' });
      }
      await Subscription.findOneAndUpdate(
        { account: req.user.id, status: 'active', remainingListings: { $gt: 0 } },
        { $inc: { remainingListings: -1 } }
      );
    }

    listing.status = 'pending';
    listing.rejectedReason = null;
    await listing.save();

    res.status(200).json({ ok: true, data: listing });
  } catch (error) {
    console.error('PATCH /seller/listings/:id/submit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /:id/hide – Ẩn / hiện tin đã approved ─────────────────────────────
router.patch('/:id/hide', authMiddleware, requireSeller, async (req, res) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, seller: req.user.id });
    if (!listing) return res.status(404).json({ error: 'Không tìm thấy tin đăng.' });

    if (!['approved', 'hidden'].includes(listing.status)) {
      return res.status(400).json({ error: 'Chỉ có thể ẩn/hiện tin đã được duyệt.' });
    }

    listing.status = listing.status === 'approved' ? 'hidden' : 'approved';
    await listing.save();

    res.status(200).json({
      ok: true,
      message: listing.status === 'hidden' ? 'Tin đã được ẩn.' : 'Tin đã được hiển thị lại.',
      data: listing,
    });
  } catch (error) {
    console.error('PATCH /seller/listings/:id/hide error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /:id/boost – Đẩy tin (dùng 1 boostCredit) ─────────────────────────
router.patch('/:id/boost', authMiddleware, requireSeller, async (req, res) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, seller: req.user.id });
    if (!listing) return res.status(404).json({ error: 'Không tìm thấy tin đăng.' });
    if (listing.status !== 'approved') {
      return res.status(400).json({ error: 'Chỉ đẩy được tin đã duyệt.' });
    }

    // Kiểm tra còn boostCredit không
    const sub = await getActiveSubscription(req.user.id);
    if (!sub || sub.remainingBoostCredits <= 0) {
      return res.status(403).json({ error: 'Không còn lượt đẩy tin. Vui lòng nâng cấp gói.' });
    }

    const boostHours = 24; // đẩy tin trong 24h
    listing.isBoosted = true;
    listing.boostedUntil = new Date(Date.now() + boostHours * 60 * 60 * 1000);
    await listing.save();

    sub.remainingBoostCredits -= 1;
    await sub.save();

    res.status(200).json({ ok: true, data: listing, remainingBoostCredits: sub.remainingBoostCredits });
  } catch (error) {
    console.error('PATCH /seller/listings/:id/boost error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /:id/pin – Ghim tin (dùng 1 pinCredit) ─────────────────────────────
router.patch('/:id/pin', authMiddleware, requireSeller, async (req, res) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, seller: req.user.id });
    if (!listing) return res.status(404).json({ error: 'Không tìm thấy tin đăng.' });
    if (listing.status !== 'approved') {
      return res.status(400).json({ error: 'Chỉ ghim được tin đã duyệt.' });
    }

    const sub = await getActiveSubscription(req.user.id);
    if (!sub || sub.remainingPinCredits <= 0) {
      return res.status(403).json({ error: 'Không còn lượt ghim tin. Vui lòng nâng cấp gói.' });
    }

    const pinDays = 7;
    listing.isPinned = true;
    listing.pinnedUntil = new Date(Date.now() + pinDays * 24 * 60 * 60 * 1000);
    await listing.save();

    sub.remainingPinCredits -= 1;
    await sub.save();

    res.status(200).json({ ok: true, data: listing, remainingPinCredits: sub.remainingPinCredits });
  } catch (error) {
    console.error('PATCH /seller/listings/:id/pin error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /:id/refresh – Làm mới ngày đăng (dùng 1 refreshCredit) ────────────
router.patch('/:id/refresh', authMiddleware, requireSeller, async (req, res) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, seller: req.user.id });
    if (!listing) return res.status(404).json({ error: 'Không tìm thấy tin đăng.' });
    if (listing.status !== 'approved') {
      return res.status(400).json({ error: 'Chỉ làm mới được tin đã duyệt.' });
    }

    const sub = await getActiveSubscription(req.user.id);
    if (!sub || sub.remainingRefreshCredits <= 0) {
      return res.status(403).json({ error: 'Không còn lượt làm mới. Vui lòng nâng cấp gói.' });
    }

    listing.lastRefreshedAt = new Date();
    listing.createdAt = new Date(); // đẩy lên đầu danh sách sort theo ngày
    await listing.save();

    sub.remainingRefreshCredits -= 1;
    await sub.save();

    res.status(200).json({ ok: true, data: listing, remainingRefreshCredits: sub.remainingRefreshCredits });
  } catch (error) {
    console.error('PATCH /seller/listings/:id/refresh error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── DELETE /:id – Xóa mềm tin đăng ──────────────────────────────────────────
router.delete('/:id', authMiddleware, requireSeller, async (req, res) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, seller: req.user.id });
    if (!listing) return res.status(404).json({ error: 'Không tìm thấy tin đăng.' });

    listing.status = 'deleted';
    await listing.save();

    res.status(200).json({ ok: true, message: 'Tin đăng đã được xóa.' });
  } catch (error) {
    console.error('DELETE /seller/listings/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
