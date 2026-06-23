const mongoose = require('mongoose');

const MaintenanceSchema = new mongoose.Schema(
  {},
  { strict: false, timestamps: true }
);

module.exports = mongoose.model('Maintenance', MaintenanceSchema);
