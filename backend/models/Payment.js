const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    roomTitle: {
      type: String,
      required: true
    },
    tenantEmail: {
      type: String,
      required: true,
      index: true
    },
    tenantName: {
      type: String,
      default: ''
    },
    amount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['Chưa thanh toán', 'Đã thanh toán'],
      default: 'Chưa thanh toán'
    },
    paymentMethod: {
      type: String,
      default: null
    },
    orderCode: {
      type: Number,
      unique: true,
      sparse: true,
      index: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', PaymentSchema);
