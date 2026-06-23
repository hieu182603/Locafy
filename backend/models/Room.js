const mongoose = require('mongoose');

/**
 * Room – Phòng trọ cụ thể trong một Property.
 * Một Room có thể có nhiều Listing (tin đăng) qua các thời kỳ.
 */
const RoomSchema = new mongoose.Schema(
  {
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

    // ── Thông tin phòng ───────────────────────────────────────────────────
    name: { type: String, trim: true, default: null }, // "Phòng 101", "Phòng tầng 2"
    roomType: {
      type: String,
      enum: ['single', 'shared', 'mini_apartment', 'apartment'],
      required: true,
    },
    area: { type: Number, required: true }, // m²
    maxOccupants: { type: Number, default: 1 },

    // ── Giá ───────────────────────────────────────────────────────────────
    price: { type: Number, required: true },        // giá thuê / tháng (VNĐ)
    deposit: { type: Number, default: 0 },          // tiền cọc (VNĐ)
    electricityRate: { type: Number, default: null }, // giá điện / kWh
    waterRate: { type: Number, default: null },       // giá nước / m³ hoặc người
    internetFee: { type: Number, default: null },     // phí internet / tháng
    parkingFee: { type: Number, default: null },      // phí gửi xe / tháng

    // ── Tiện ích & nội thất ───────────────────────────────────────────────
    amenities: { type: [String], default: [] },
    // ví dụ: ['ac', 'water_heater', 'fridge', 'washing_machine', 'balcony', ...]
    furniture: { type: [String], default: [] },
    rules: { type: String, trim: true, default: null }, // nội quy phòng

    // ── Hình ảnh & video ──────────────────────────────────────────────────
    imageUrls: { type: [String], default: [] },
    videoUrl: { type: String, default: null },

    // ── Trạng thái ────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['available', 'rented', 'maintenance'],
      default: 'available',
    },
    isActive: { type: Boolean, default: true }, // false = Seller ẩn phòng
  },
  { timestamps: true }
);

RoomSchema.index({ property: 1, isActive: 1 });
RoomSchema.index({ seller: 1, status: 1 });
RoomSchema.index({ price: 1 });

module.exports = mongoose.model('Room', RoomSchema);
