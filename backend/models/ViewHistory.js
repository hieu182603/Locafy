const mongoose = require('mongoose');

/**
 * ViewHistory – Lịch sử phòng User đã xem.
 * Dùng cho MVP 5 (lịch sử đã xem) và gợi ý phòng.
 */
const ViewHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },
    viewedAt: { type: Date, default: Date.now },
    // Số lần xem (upsert để gộp)
    viewCount: { type: Number, default: 1 },
  },
  {
    // Không dùng timestamps vì ta quản lý viewedAt thủ công
  }
);

// Mỗi (user, listing) chỉ có 1 bản ghi – update viewCount khi xem lại
ViewHistorySchema.index({ user: 1, listing: 1 }, { unique: true });
ViewHistorySchema.index({ user: 1, viewedAt: -1 });

// Tự xoá sau 30 ngày
ViewHistorySchema.index({ viewedAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });

module.exports = mongoose.model('ViewHistory', ViewHistorySchema);
