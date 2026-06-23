const mongoose = require('mongoose');

/**
 * Conversation – Luồng hội thoại giữa User và Seller (thường gắn với một Listing).
 * Mỗi cặp (user, seller, listing) chỉ có 1 conversation.
 * Tin nhắn chi tiết lưu trong Message.
 */
const ConversationSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      default: null, // có thể null nếu chat chung không gắn listing
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },

    // ── Tin nhắn cuối (cache để hiển thị danh sách hội thoại) ─────────────
    lastMessage: { type: String, default: null },
    lastMessageAt: { type: Date, default: null },
    lastMessageBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },

    // ── Số tin chưa đọc (per participant) ────────────────────────────────
    unreadByUser: { type: Number, default: 0 },
    unreadBySeller: { type: Number, default: 0 },

    // ── Trạng thái ────────────────────────────────────────────────────────
    isBlockedByUser: { type: Boolean, default: false },
    isBlockedBySeller: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Mỗi (user, seller, listing) chỉ có 1 conversation
ConversationSchema.index({ user: 1, seller: 1, listing: 1 }, { unique: true });
ConversationSchema.index({ user: 1, lastMessageAt: -1 });
ConversationSchema.index({ seller: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', ConversationSchema);
