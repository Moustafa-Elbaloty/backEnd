const express = require("express");
const router = express.Router();

const {
  addProduct,
  updateProduct,
  deleteProduct,
  getProducts,
  getProductByID,
} = require("../controllers/productController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRole } = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMemory");

// ===============================
// Product Routes (Cloudinary)
// ===============================

// ➕ Add Product (image required)
router.post(
  "/addProduct",
  protect,
  authorizeRole("vendor", "admin"),
  upload.single("image"),
  addProduct
);

// ✏️ Update Product (image optional)
router.put(
  "/:id",
  protect,
  authorizeRole("vendor", "admin"),
  upload.single("image"),
  updateProduct
);

// ❌ Delete Product
router.delete(
  "/:id",
  protect,
  authorizeRole("vendor", "admin"),
  deleteProduct
);

// 📦 Get single product (public)
router.get("/:id", getProductByID);

// 📦 Get all products (public)
router.get("/", getProducts);

module.exports = router;
