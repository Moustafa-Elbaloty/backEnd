const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    totalItemPrice: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    items: [orderItemSchema],

    paymentMethod: {
      type: String,
      enum: ["cash", "stripe", "paypal", "paymob"],
      required: true,
    },

    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    adminCommission: {
      type: Number,
      default: 0,
    },

    sellerAmount: {
      type: Number,
      default: 0,
    },

    orderStatus: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },

    // 🔵 Paymob fields
    paymobOrderId: String,
    paymobTransactionId: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
