const mongoose = require('mongoose');

/**
 * Report – Báo cáo vi phạm tin đăng hoặc hội thoại.
 */
const ReportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },

    // ── Đối tượng bị báo cáo ──────────────────────────────────────────────
    entityType: {
      type: String,
      enum: ['listing', 'conversation', 'account'],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    // ── Nội dung báo cáo ─────────────────────────────────────────────────
    reason: {
      type: String,
      enum: [
        'spam',
        'wrong_info',
        'offensive',
        'duplicate',
        'fraud',
        'other',
      ],
      required: true,
    },
    description: { type: String, trim: true, default: null },
    evidenceUrls: { type: [String], default: [] },

    // ── Xử lý bởi Admin ──────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
      default: 'pending',
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },
    resolvedAt: { type: Date, default: null },
    adminNote: { type: String, default: null },
  },
  { timestamps: true }
);

ReportSchema.index({ entityType: 1, entityId: 1, status: 1 });
ReportSchema.index({ reporter: 1 });

module.exports = mongoose.model('Report', ReportSchema);
