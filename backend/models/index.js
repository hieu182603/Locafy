/**
 * models/index.js
 * Export tập trung tất cả Mongoose models.
 * Import từ đây: const { Account, Listing } = require('./models');
 */

module.exports = {
  Account:        require('./Account'),
  SellerProfile:  require('./SellerProfile'),
  UserPreference: require('./UserPreference'),
  Property:       require('./Property'),
  Room:           require('./Room'),
  Listing:        require('./Listing'),
  Appointment:    require('./Appointment'),
  Conversation:   require('./Conversation'),
  Message:        require('./Message'),
  Notification:   require('./Notification'),
  ServicePackage: require('./ServicePackage'),
  Subscription:   require('./Subscription'),
  Transaction:    require('./Transaction'),
  Report:         require('./Report'),
  Favorite:       require('./Favorite'),
  ViewHistory:    require('./ViewHistory'),
  SavedSearch:    require('./SavedSearch'),
  Otp:            require('./Otp'),
  Banner:         require('./Banner'),
  Article:        require('./Article'),
  Coupon:         require('./Coupon'),
};


