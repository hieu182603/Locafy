const mongoose = require('mongoose');

/**
 * UserPreference – nhu cầu tìm trọ của User (1-1 với Account).
 * Dùng để gợi ý phòng (MVP 5) và Fast Match (MVP 4).
 */
const UserPreferenceSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      unique: true,
    },

    school: { type: String, trim: true, default: null }, // trường đang học
    preferredArea: { type: String, trim: true, default: null }, // khu vực mong muốn

    minPrice: { type: Number, default: null },
    maxPrice: { type: Number, default: null },

    roomType: {
      type: String,
      enum: ['single', 'shared', 'mini_apartment', 'apartment', null],
      default: null,
    },

    maxOccupants: { type: Number, default: null }, // số người dự kiến ở
    moveInDate: { type: Date, default: null },      // ngày dự kiến chuyển vào

    // Tiện ích mong muốn (array của enum)
    desiredAmenities: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserPreference', UserPreferenceSchema);
