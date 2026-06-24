const express = require('express');
const router = express.Router();
const { Listing, ViewHistory } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');

// authMiddleware tuỳ chọn – không throw lỗi nếu không có token
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();
  authMiddleware(req, res, next);
}

// ── GET / – Public: danh sách listings đã duyệt (filter nâng cao) ────────────
// Query: province, district, keyword, minPrice, maxPrice, minArea, maxArea,
//        roomType, amenities (comma-sep), availableFrom,
//        sortBy (price_asc|price_desc|newest|distance), page, limit
router.get('/', async (req, res) => {
  try {
    const {
      province, district, keyword,
      minPrice, maxPrice,
      minArea, maxArea,
      roomType, amenities, availableFrom,
      sortBy = 'newest',
      page = 1, limit = 20,
    } = req.query;

    const filter = { status: 'approved' };

    if (province)  filter.province = province;
    if (district)  filter.district = district;
    if (roomType)  filter.roomType = roomType;

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (minArea || maxArea) {
      filter.area = {};
      if (minArea) filter.area.$gte = Number(minArea);
      if (maxArea) filter.area.$lte = Number(maxArea);
    }

    if (keyword) {
      filter.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { district: { $regex: keyword, $options: 'i' } },
        { addressLine: { $regex: keyword, $options: 'i' } },
      ];
    }

    if (amenities) {
      const arr = amenities.split(',').map(a => a.trim()).filter(Boolean);
      if (arr.length) filter.amenities = { $all: arr };
    }

    if (availableFrom) {
      filter.availableFrom = { $lte: new Date(availableFrom) };
    }

    // Sort
    const sortMap = {
      price_asc:  { isPinned: -1, isBoosted: -1, price: 1 },
      price_desc: { isPinned: -1, isBoosted: -1, price: -1 },
      newest:     { isPinned: -1, isBoosted: -1, createdAt: -1 },
    };
    const sort = sortMap[sortBy] || sortMap.newest;

    // Reset boost/pin đã hết hạn (fire-and-forget, không block response)
    const now = new Date();
    Listing.updateMany(
      { $or: [
        { isBoosted: true, boostedUntil: { $lt: now } },
        { isPinned: true, pinnedUntil: { $lt: now } },
      ]},
      { $set: { isBoosted: false, isPinned: false } }
    ).exec();

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Listing.find(filter)
        .populate('room', 'name roomType area price amenities imageUrls')
        .populate('property', 'name addressLine ward district province')
        .populate('seller', 'name avatarUrl')   // KHÔNG expose phone ở danh sách
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Listing.countDocuments(filter),
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
    console.error('GET /listings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /:id – Chi tiết listing (ẩn SĐT & địa chỉ đầy đủ nếu chưa đăng nhập)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('room')
      .populate('property')
      .populate('seller', 'name avatarUrl isEmailVerified verificationStatus');

    if (!listing) return res.status(404).json({ error: 'Không tìm thấy tin đăng.' });
    if (listing.status !== 'approved') {
      // Seller của tin hoặc Admin mới xem được
      const userId = req.user?.id;
      const role = req.user?.role;
      const isSeller = role === 'seller' && String(listing.seller._id) === String(userId);
      const isAdmin = role === 'admin';
      if (!isSeller && !isAdmin) {
        return res.status(403).json({ error: 'Tin đăng chưa được duyệt.' });
      }
    }

    // Tăng viewCount (fire-and-forget, không block response)
    Listing.findByIdAndUpdate(listing._id, { $inc: { viewCount: 1 } }).exec();

    // Loại bỏ thông tin nhạy cảm nếu Guest (chưa đăng nhập)
    const isLoggedIn = !!req.user;
    const data = listing.toObject();
    if (!isLoggedIn) {
      // Ẩn địa chỉ đầy đủ, giữ district/province
      delete data.addressLine;
      if (data.location) delete data.location;
      if (data.property) {
        delete data.property.addressLine;
        delete data.property.location;
      }
    }

    res.status(200).json({ ok: true, data, isContactVisible: isLoggedIn });
  } catch (error) {
    console.error('GET /listings/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /:id/contact – User đã đăng nhập: lấy SĐT + địa chỉ đầy đủ ─────────
router.get('/:id/contact', authMiddleware, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .select('seller addressLine location status')
      .populate('seller', 'name phone email avatarUrl');

    if (!listing) return res.status(404).json({ error: 'Không tìm thấy tin đăng.' });
    if (listing.status !== 'approved') {
      return res.status(403).json({ error: 'Tin đăng chưa được duyệt.' });
    }

    res.status(200).json({
      ok: true,
      data: {
        seller: listing.seller,
        addressLine: listing.addressLine,
        location: listing.location,
      },
    });
  } catch (error) {
    console.error('GET /listings/:id/contact error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST / – Seller tạo listing ──────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'seller') {
      return res.status(403).json({ error: 'Chỉ seller mới có thể đăng tin.' });
    }

    // Kiểm tra seller đã được xác minh chưa
    const { Account, Subscription } = require('../models');
    const account = await Account.findById(req.user.id).select('verificationStatus');
    if (!account || account.verificationStatus !== 'approved') {
      return res.status(403).json({
        error: 'Seller chưa được xác minh. Vui lòng hoàn thành xác minh trước khi đăng tin.',
      });
    }

    // Kiểm tra hạn mức tin đăng theo gói
    const sub = await Subscription.findOne({ account: req.user.id, status: 'active' });
    if (sub && sub.remainingListings !== null && sub.remainingListings <= 0) {
      return res.status(403).json({
        error: 'Bạn đã hết hạn mức tin đăng. Vui lòng nâng cấp gói dịch vụ.',
      });
    }

    const listing = new Listing({
      ...req.body,
      seller: req.user.id,
      status: 'pending',
    });
    await listing.save();

    // Trừ hạn mức
    if (sub && sub.remainingListings !== null) {
      await Subscription.findOneAndUpdate(
        { account: req.user.id, status: 'active', remainingListings: { $gt: 0 } },
        { $inc: { remainingListings: -1 } }
      );
    }

    res.status(201).json({ ok: true, data: listing });
  } catch (error) {
    console.error('POST /listings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /:id – Seller sửa nội dung listing ─────────────────────────────────
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Không tìm thấy tin đăng.' });

    const isSeller = req.user.role === 'seller' && String(listing.seller) === String(req.user.id);
    const isAdmin = req.user.role === 'admin';
    if (!isSeller && !isAdmin) {
      return res.status(403).json({ error: 'Không có quyền chỉnh sửa tin đăng này.' });
    }

    const allowedFields = [
      'title', 'description', 'price', 'deposit', 'area', 'roomType',
      'addressLine', 'ward', 'district', 'province', 'location',
      'amenities', 'imageUrls', 'videoUrl', 'availableFrom',
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (isSeller && Object.keys(updates).length > 0) {
      updates.status = 'pending'; // Về pending để duyệt lại
    }

    const updated = await Listing.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    res.status(200).json({ ok: true, data: updated });
  } catch (error) {
    console.error('PATCH /listings/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /:id/status – Admin duyệt / từ chối / ẩn listing ──────────────────
// Body: { status: 'approved'|'rejected'|'hidden'|'pending', rejectedReason? }
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ admin mới có quyền duyệt tin.' });
    }
    const { status, rejectedReason } = req.body;
    const validStatuses = ['approved', 'rejected', 'hidden', 'pending'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `status phải là một trong: ${validStatuses.join(', ')}` });
    }

    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Không tìm thấy tin đăng.' });

    listing.status = status;
    listing.rejectedReason = status === 'rejected' ? (rejectedReason || null) : null;
    listing.reviewedBy = req.user.id;
    listing.reviewedAt = new Date();
    await listing.save();

    res.status(200).json({ ok: true, data: listing });
  } catch (error) {
    console.error('PATCH /listings/:id/status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── DELETE /:id – Seller / Admin xóa mềm listing ─────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Không tìm thấy tin đăng.' });

    const isSeller = req.user.role === 'seller' && String(listing.seller) === String(req.user.id);
    const isAdmin = req.user.role === 'admin';
    if (!isSeller && !isAdmin) {
      return res.status(403).json({ error: 'Không có quyền xóa tin đăng này.' });
    }

    listing.status = 'deleted';
    await listing.save();

    res.status(200).json({ ok: true, message: 'Tin đăng đã được xóa.' });
  } catch (error) {
    console.error('DELETE /listings/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /:id/view – User ghi nhận lịch sử xem (auth optional) ───────────────
router.post('/:id/view', optionalAuth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).select('_id status');
    if (!listing || listing.status !== 'approved') {
      return res.status(404).json({ error: 'Không tìm thấy tin đăng.' });
    }

    if (req.user) {
      // Upsert: ghi nhận lần xem, tăng viewCount
      await ViewHistory.findOneAndUpdate(
        { user: req.user.id, listing: req.params.id },
        { $set: { viewedAt: new Date() }, $inc: { viewCount: 1 } },
        { upsert: true, new: true }
      );
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('POST /listings/:id/view error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
