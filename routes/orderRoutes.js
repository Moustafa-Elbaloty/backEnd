const express = require("express");
const router = express.Router();

// استدعاء الكونترولر
const {
  createOrder,
  getMyOrders,
  cancelOrder,
  updateOrderStatus,
  retryPayment, // 🟢 NEW
} = require("../controllers/orderController");

// ميدل وير الحماية
const { protect } = require("../middleware/authMiddleware");

// ==============================
// Orders Routes
// ==============================

// POST /api/orders/create
router.post("/create", protect, createOrder);

// GET /api/orders/myorders
router.get("/myorders", protect, getMyOrders);

// PUT /api/orders/cancel/:id
router.put("/cancel/:id", protect, cancelOrder);

// PUT /api/orders/:id/status
router.put("/:id/status", protect, updateOrderStatus);

// 🟢 POST /api/orders/:id/retry-payment
router.post("/:id/retry-payment", protect, retryPayment);

module.exports = router;
