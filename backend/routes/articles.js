const express = require('express');
const router = express.Router();
const { Article } = require('../models');
const adminMiddleware = require('../middlewares/adminMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');

// ── GET / – Public: lấy bài viết đã published ────────────────────────────────
// Query: type (blog|faq|policy|guide), tag, page, limit
router.get('/', async (req, res) => {
  try {
    const { type, tag, page = 1, limit = 20 } = req.query;
    const filter = { isPublished: true };
    if (type) filter.type = type;
    if (tag) filter.tags = tag;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Article.find(filter)
        .select('-content') // Không trả nội dung đầy đủ trong danh sách
        .populate('createdBy', 'name')
        .sort({ sortOrder: 1, publishedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Article.countDocuments(filter),
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
    console.error('GET /articles error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /all – Admin: lấy tất cả bài viết ────────────────────────────────────
router.get('/all', adminMiddleware, async (req, res) => {
  try {
    const { type, isPublished, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (isPublished !== undefined) filter.isPublished = isPublished === 'true';

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Article.find(filter)
        .select('-content')
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Article.countDocuments(filter),
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
    console.error('GET /articles/all error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /:slug – Public: xem chi tiết bài viết theo slug ─────────────────────
router.get('/:slug', async (req, res) => {
  try {
    const article = await Article.findOne({ slug: req.params.slug })
      .populate('createdBy', 'name avatarUrl');

    if (!article) return res.status(404).json({ error: 'Không tìm thấy bài viết.' });
    if (!article.isPublished) {
      return res.status(403).json({ error: 'Bài viết chưa được xuất bản.' });
    }

    res.status(200).json({ ok: true, data: article });
  } catch (error) {
    console.error('GET /articles/:slug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /admin/:id – Admin: xem chi tiết bài viết theo id ────────────────────
router.get('/admin/:id', adminMiddleware, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!article) return res.status(404).json({ error: 'Không tìm thấy bài viết.' });
    res.status(200).json({ ok: true, data: article });
  } catch (error) {
    console.error('GET /articles/admin/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST / – Admin tạo bài viết ──────────────────────────────────────────────
// Body: { type, title, slug, content, summary?, thumbnailUrl?, tags?, metaTitle?, metaDescription?, sortOrder? }
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { type, title, slug, content, summary, thumbnailUrl, tags, metaTitle, metaDescription, sortOrder } = req.body;
    if (!type || !title || !slug || !content) {
      return res.status(400).json({ error: 'Thiếu các trường bắt buộc: type, title, slug, content.' });
    }

    const existing = await Article.findOne({ slug });
    if (existing) return res.status(409).json({ error: 'Slug đã tồn tại, vui lòng dùng slug khác.' });

    const article = new Article({
      type,
      title,
      slug,
      content,
      summary: summary || null,
      thumbnailUrl: thumbnailUrl || null,
      tags: tags || [],
      metaTitle: metaTitle || null,
      metaDescription: metaDescription || null,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
      isPublished: false,
      createdBy: req.user.id,
    });
    await article.save();

    res.status(201).json({ ok: true, data: article });
  } catch (error) {
    console.error('POST /articles error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /:id – Admin cập nhật bài viết ─────────────────────────────────────
router.patch('/:id', adminMiddleware, async (req, res) => {
  try {
    const allowedFields = [
      'type', 'title', 'slug', 'content', 'summary', 'thumbnailUrl',
      'tags', 'metaTitle', 'metaDescription', 'sortOrder',
    ];
    const updates = { updatedBy: req.user.id };
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    // Kiểm tra slug trùng nếu có thay đổi slug
    if (updates.slug) {
      const existing = await Article.findOne({ slug: updates.slug, _id: { $ne: req.params.id } });
      if (existing) return res.status(409).json({ error: 'Slug đã tồn tại.' });
    }

    const article = await Article.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    );
    if (!article) return res.status(404).json({ error: 'Không tìm thấy bài viết.' });

    res.status(200).json({ ok: true, data: article });
  } catch (error) {
    console.error('PATCH /articles/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /:id/publish – Admin xuất bản / ẩn bài viết ────────────────────────
// Body: { isPublished: true | false }
router.patch('/:id/publish', adminMiddleware, async (req, res) => {
  try {
    const { isPublished } = req.body;
    if (typeof isPublished !== 'boolean') {
      return res.status(400).json({ error: 'isPublished phải là boolean.' });
    }

    const updates = {
      isPublished,
      updatedBy: req.user.id,
    };
    if (isPublished) {
      updates.publishedAt = new Date();
    }

    const article = await Article.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    );
    if (!article) return res.status(404).json({ error: 'Không tìm thấy bài viết.' });

    res.status(200).json({
      ok: true,
      message: isPublished ? 'Bài viết đã được xuất bản.' : 'Bài viết đã bị ẩn.',
      data: article,
    });
  } catch (error) {
    console.error('PATCH /articles/:id/publish error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── DELETE /:id – Admin xóa bài viết ─────────────────────────────────────────
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const article = await Article.findByIdAndDelete(req.params.id);
    if (!article) return res.status(404).json({ error: 'Không tìm thấy bài viết.' });

    res.status(200).json({ ok: true, message: 'Bài viết đã được xóa.' });
  } catch (error) {
    console.error('DELETE /articles/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
