const express = require("express");
const router = express.Router();

// استخدم الكونترولر الصحيح من مجلد controllers
const {
  getCart,
  addToCart,
  removeFromCart,
  updateCartItem,
  getAllCarts,
  deleteCart,
} = require("../controllers/cartController");

const { authorizeRole } = require("../middleware/roleMiddleware");

// استخدم ميدل وير الحماية الموحد
const { protect } = require("../middleware/authMiddleware");

// GET /api/cart/
router.get("/", protect, getCart);

// GET /api/cart/allCarts
router.get("/allCarts", protect, authorizeRole("admin"), getAllCarts);

// DELETE /api/cart/delete/:userId
router.delete("/delete/:userId", protect, authorizeRole("admin"), deleteCart); 

// POST /api/cart/add
router.post("/add", protect, addToCart);

// PUT /api/cart/update/:productId
router.put("/update/:productId", protect, updateCartItem);

// DELETE /api/cart/remove/:productId
router.delete("/remove/:productId", protect, removeFromCart);

module.exports = router;
