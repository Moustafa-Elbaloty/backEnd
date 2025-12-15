const express = require("express");
const router = express.Router();

// استدعاء الكونترولر الصحيح
const {
  createOrder,
  getMyOrders,
  cancelOrder,
  updateOrderStatus,
} = require("../controllers/orderController");
const {authorizeRole} = require("../middleware/roleMiddleware");

// ميدل وير الحماية الموحد
const { protect } = require("../middleware/authMiddleware");

// POST /api/orders/create
router.post("/create", protect, createOrder);

// GET /api/orders/myorders
router.get("/myorders", protect, getMyOrders);

// PUT /api/orders/cancel/:id
router.put("/cancel/:id", protect, cancelOrder);

// PUT /api/orders/:id/status
router.put("/:id/status", protect, updateOrderStatus);

module.exports = router;
