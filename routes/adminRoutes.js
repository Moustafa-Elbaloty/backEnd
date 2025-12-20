const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { authorizeRole } = require("../middleware/roleMiddleware");

// ================= Controllers =================

// Users
const {
  getAllUsers,
  updateUser,
  deleteUser,
  getUser
} = require("../controllers/userController");

// Orders
const {
  getAllOrders,
  getOrderById,
  updateOrderStatus
} = require("../controllers/orderController");

// Products
const {
  getAllProductsAdmin,
  deleteProduct
} = require("../controllers/productController");

// Payments / Stats
const {
  getAllPayments,
  getAdminDashboardStats
} = require("../controllers/paymentController");

// ✅ Vendors (IMPORTANT)
const {
  getPendingVendors,
  approveVendor,
  rejectVendor
} = require("../controllers/vendorAdminController");


// ================= USERS =================
router.get(
  "/users",
  protect,
  authorizeRole("admin"),
  getAllUsers
);

router.get(
  "/getUser/:id",
  protect,
  authorizeRole("admin"),
  getUser
);

router.put(
  "/updateUser/:id",
  protect,
  authorizeRole("admin"),
  updateUser
);

router.delete(
  "/deleteUser/:id",
  protect,
  authorizeRole("admin"),
  deleteUser
);


// ================= VENDORS =================

// 🟡 Get pending vendors
router.get(
  "/vendors/pending",
  protect,
  authorizeRole("admin"),
  getPendingVendors
);

// 🟢 Approve vendor
router.put(
  "/vendors/:id/approve",
  protect,
  authorizeRole("admin"),
  approveVendor
);

// 🔴 Reject vendor
router.put(
  "/vendors/:id/reject",
  protect,
  authorizeRole("admin"),
  rejectVendor
);


// ================= ORDERS =================
router.get(
  "/orders",
  protect,
  authorizeRole("admin"),
  getAllOrders
);

router.get(
  "/order/:id",
  protect,
  authorizeRole("admin"),
  getOrderById
);

router.put(
  "/orders/:id",
  protect,
  authorizeRole("admin"),
  updateOrderStatus
);


// ================= PRODUCTS =================
router.get(
  "/products",
  protect,
  authorizeRole("admin"),
  getAllProductsAdmin
);

router.delete(
  "/products/:id",
  protect,
  authorizeRole("admin"),
  deleteProduct
);


// ================= PAYMENTS / STATS =================
router.get(
  "/payments/all",
  protect,
  authorizeRole("admin"),
  getAllPayments
);

router.get(
  "/stats",
  protect,
  authorizeRole("admin"),
  getAdminDashboardStats
);

module.exports = router;
