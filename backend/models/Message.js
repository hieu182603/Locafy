const mongoose = require('mongoose');

/**
 * Message – Tin nhắn trong một Conversation.
 * Hỗ trợ text và ảnh.
 */
const MessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },

    // ── Nội dung ─────────────────────────────────────────────────────────
    type: {
      type: String,
      enum: ['text', 'image', 'listing_share', 'system'],
      default: 'text',
    },
    text: { type: String, trim: true, default: null },
    imageUrl: { type: String, default: null },

    // Khi type = 'listing_share': đính kèm thông tin phòng
    sharedListing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      default: null,
    },

    // ── Trạng thái ────────────────────────────────────────────────────────
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },

    // Xoá mềm (người gửi rút lại)
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

MessageSchema.index({ conversation: 1, createdAt: 1 });

module.exports = mongoose.model('Message', MessageSchema);
