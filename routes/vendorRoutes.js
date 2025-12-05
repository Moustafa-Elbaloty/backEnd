const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { authorizeRole } = require("../middleware/roleMiddleware");
const {
  getAllVendors,
  deleteAnyVendor,
  getAnyVendorProducts,
  createVendor,
  updateVendor,
  deleteVendor,
  getVendorProducts,
  getVendorProfile,
  getVendorDashboard,
} = require("../controllers/vendorController");

// =====================
// Admin Routes
// =====================

// جلب كل البائعين (Admin only)
router.get("/allVendors", protect, authorizeRole("admin"), getAllVendors); 
// حذف أي بائع بواسطة الـ admin
router.delete("/delete/:id", protect, authorizeRole("admin"), deleteAnyVendor); 
// جلب منتجات أي بائع بواسطة الـ admin
router.get("/getProducts/:id", protect, authorizeRole("admin"), getAnyVendorProducts);

// =====================
// Vendor / User Routes
// =====================

// إنشاء Vendor جديد (لـ user بعد التسجيل)
router.post("/create", protect, createVendor);

// جلب بيانات البائع الحالي
router.get("/profile", protect, getVendorProfile);

// تحديث بيانات البائع الحالي (store name)
router.put("/update", protect, updateVendor);

// حذف حساب البائع الحالي
router.delete("/delete", protect, deleteVendor);

// جلب كل منتجات البائع الحالي
router.get("/products", protect, getVendorProducts);

// =====================
// Vendor Dashboard
// =====================

// Dashboard خاص بالبائع فقط
router.get("/dashboard", protect, authorizeRole("vendor"), getVendorDashboard);

module.exports = router;
