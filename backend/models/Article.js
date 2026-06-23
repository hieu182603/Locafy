const mongoose = require('mongoose');

/**
 * Article – Bài viết / FAQ / Chính sách của hệ thống (MVP 5).
 */
const ArticleSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['blog', 'faq', 'policy', 'guide'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    content: { type: String, required: true },       // HTML / Markdown
    summary: { type: String, trim: true, default: null },
    thumbnailUrl: { type: String, default: null },
    tags: { type: [String], default: [] },

    // SEO
    metaTitle: { type: String, trim: true, default: null },
    metaDescription: { type: String, trim: true, default: null },

    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    sortOrder: { type: Number, default: 0 },         // dùng cho FAQ/policy

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
  },
  { timestamps: true }
);

ArticleSchema.index({ type: 1, isPublished: 1, sortOrder: 1 });
ArticleSchema.index({ slug: 1 }, { unique: true });

module.exports = mongoose.model('Article', ArticleSchema);
