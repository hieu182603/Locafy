const mongoose = require('mongoose');

const ContractSchema = new mongoose.Schema(
  {},
  { strict: false, timestamps: true }
);

module.exports = mongoose.model('Contract', ContractSchema);
