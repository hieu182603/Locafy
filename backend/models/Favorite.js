const mongoose = require('mongoose');

/**
 * Favorite – Phòng được User lưu yêu thích.
 */
const FavoriteSchema = new mongoose.Schema(
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
  },
  { timestamps: true }
);

// Mỗi user chỉ lưu 1 lần mỗi listing
FavoriteSchema.index({ user: 1, listing: 1 }, { unique: true });
FavoriteSchema.index({ listing: 1 }); // đếm số lượt lưu

module.exports = mongoose.model('Favorite', FavoriteSchema);
