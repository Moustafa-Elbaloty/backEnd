const Stripe = require("stripe");
const dotenv = require("dotenv");
dotenv.config();

let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

const Payment = require("../models/paymentModel");
const Order = require("../models/orderModel");
const User = require("../models/userModel");
const Product = require("../models/productModel");

/* ======================================================
   🟢 USER PAYMENTS
====================================================== */
exports.getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.id })
      .populate("order")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ======================================================
   🟢 GET PAYMENT BY ID
====================================================== */
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate("order");

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.json({
      success: true,
      payment,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ======================================================
   🟢 STRIPE CONFIRM
====================================================== */
exports.confirmStripePayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    const payment = await Payment.findOne({
      transactionId: paymentIntentId,
      method: "stripe",
    }).populate("order");

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      payment.status = "paid";
      await payment.save();

      if (payment.order) {
        payment.order.paymentStatus = "paid";
        payment.order.orderStatus = "processing";
        await payment.order.save();
      }
    }

    res.json({
      success: true,
      payment,
      order: payment.order,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ======================================================
   🟢 STRIPE INIT
====================================================== */
exports.stripeInit = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      user: req.user.id,
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.paymentStatus === "paid") {
      return res.status(400).json({ message: "Order already paid" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalPrice * 100),
      currency: "usd",
      payment_method_types: ["card"],
    });

    const payment = await Payment.create({
      user: req.user.id,
      order: orderId,
      method: "stripe",
      amount: order.totalPrice,
      status: "pending",
      transactionId: paymentIntent.id,
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      payment,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ======================================================
   🟢 PAYPAL (SIMULATION)
====================================================== */
exports.paypalPay = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      user: req.user.id,
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const payment = await Payment.create({
      user: req.user.id,
      order: orderId,
      method: "paypal",
      amount: order.totalPrice,
      status: "paid",
      transactionId: "PAYPAL-" + Date.now(),
    });

    order.paymentStatus = "paid";
    order.orderStatus = "processing";
    await order.save();

    res.json({
      success: true,
      payment,
      order,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ======================================================
   🟢 CASH PAYMENT
====================================================== */
exports.cashPay = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      user: req.user.id,
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const payment = await Payment.create({
      user: req.user.id,
      order: orderId,
      method: "cash",
      amount: order.totalPrice,
      status: "pending",
    });

    order.paymentStatus = "pending";
    order.orderStatus = "pending";
    await order.save();

    res.json({
      success: true,
      payment,
      order,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ======================================================
   🟢 ADMIN – GET ALL PAYMENTS
====================================================== */
exports.getAllPayments = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const payments = await Payment.find()
      .populate("user", "name email role")
      .populate("order", "totalPrice paymentStatus orderStatus")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ======================================================
   🟢 ADMIN – DASHBOARD STATS (FINAL)
====================================================== */
exports.getAdminDashboardStats = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const totalUsers = await User.countDocuments({ role: { $ne: "admin" } });
    const totalProducts = await Product.countDocuments();

    const ordersAgg = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      totalUsers,
      totalProducts,
      totalOrders: ordersAgg[0]?.totalOrders || 0,
      totalRevenue: ordersAgg[0]?.totalRevenue || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
