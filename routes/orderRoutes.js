const express = require("express");
const router = express.Router();

// استدعاء الكونترولر الصحيح
const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  getAllOrders
} = require("../controllers/orderController");
const {verifyAdmin} = require("../middleware/authMiddleware");

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

// GET /api/orders/:id
router.get("/:id", protect, getOrderById);

// Admin routes
router.get("/orders", protect, verifyAdmin, getAllOrders);
router.get("/order/:id", protect, verifyAdmin, getOrderById); 
module.exports = router;
