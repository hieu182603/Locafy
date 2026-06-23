const mongoose = require('mongoose');

/**
 * Banner – Ảnh quảng cáo/thông báo hiển thị trên trang chủ (MVP 5).
 */
const BannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true },
    linkUrl: { type: String, trim: true, default: null }, // link khi click
    position: {
      type: String,
      enum: ['home_top', 'home_middle', 'search_top', 'sidebar'],
      default: 'home_top',
    },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  },
  { timestamps: true }
);

BannerSchema.index({ position: 1, isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('Banner', BannerSchema);
