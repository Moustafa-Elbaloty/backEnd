const express = require("express");
const router = express.Router();
const {authorizeRole} = require("../middleware/roleMiddleware")

// الكونترولر الصحيح
const {
  stripeInit,
  paypalPay,
  cashPay,
  getMyPayments,
  getPaymentById,
  confirmStripePayment,
  getAllPayments, 
} = require("../controllers/paymentController");

// ميدل وير الحماية الموحد
const { protect } = require("../middleware/authMiddleware");

// GET /api/payment/payments (كل المدفوعات للمستخدم)
router.get("/payments", protect, getMyPayments);

// GET /api/payment/payments/:id
router.get("/payments/:id", protect, getPaymentById);

// POST /api/payment/stripe
router.post("/stripe", protect, stripeInit);

// POST /api/payment/stripe/confirm
router.post("/stripe/confirm", protect, confirmStripePayment);

// POST /api/payment/paypal
router.post("/paypal", protect, paypalPay);

// POST /api/payment/cash
router.post("/cash", protect, cashPay);

//GET/api/payment/allpayments
router.get("/allpayments", protect, authorizeRole("admin"), getAllPayments);

module.exports = router;
