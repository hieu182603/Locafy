const mongoose = require('mongoose');

/**
 * Listing – Tin đăng của Seller cho một Room.
 * Một Room có thể có tối đa 1 Listing active tại một thời điểm.
 * Lịch sử tin được giữ lại (status: expired/deleted).
 */
const ListingSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },

    // ── Nội dung tin ──────────────────────────────────────────────────────
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: null },

    // Snapshot giá tại thời điểm đăng (phòng có thể thay đổi giá sau)
    price: { type: Number, required: true },
    deposit: { type: Number, default: 0 },
    area: { type: Number, required: true },
    roomType: {
      type: String,
      enum: ['single', 'shared', 'mini_apartment', 'apartment'],
      required: true,
    },

    // Snapshot địa chỉ (hiển thị trên kết quả tìm kiếm)
    addressLine: { type: String, trim: true },
    ward: { type: String, trim: true },
    district: { type: String, trim: true },
    province: { type: String, trim: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },

    amenities: { type: [String], default: [] },
    imageUrls: { type: [String], default: [] },
    videoUrl: { type: String, default: null },

    // ── Kiểm duyệt ────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected', 'hidden', 'expired', 'deleted'],
      default: 'draft',
    },
    rejectedReason: { type: String, default: null },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },
    reviewedAt: { type: Date, default: null },

    // ── Hiển thị & tăng hiệu quả ──────────────────────────────────────────
    isPinned: { type: Boolean, default: false },
    pinnedUntil: { type: Date, default: null },
    isBoosted: { type: Boolean, default: false },  // đang được đẩy tin
    boostedUntil: { type: Date, default: null },
    lastRefreshedAt: { type: Date, default: null }, // lượt làm mới

    // Ngày hết hạn tin (theo gói)
    expiresAt: { type: Date, default: null },

    // ── Thống kê (cập nhật bởi event) ────────────────────────────────────
    viewCount: { type: Number, default: 0 },
    saveCount: { type: Number, default: 0 },
    contactCount: { type: Number, default: 0 },
    appointmentCount: { type: Number, default: 0 },

    // ── Ngày có thể chuyển vào ────────────────────────────────────────────
    availableFrom: { type: Date, default: null },
  },
  { timestamps: true }
);

// ── Index ────────────────────────────────────────────────────────────────────
ListingSchema.index({ location: '2dsphere' });
ListingSchema.index({ status: 1, isPinned: -1, isBoosted: -1, createdAt: -1 });
ListingSchema.index({ seller: 1, status: 1 });
ListingSchema.index({ price: 1, area: 1 });
ListingSchema.index({ district: 1, province: 1, status: 1 });
ListingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL tự xoá

module.exports = mongoose.model('Listing', ListingSchema);
