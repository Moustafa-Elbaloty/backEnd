const express = require("express");
const router = express.Router();

const { authorizeRole } = require("../middleware/roleMiddleware");
const { protect } = require("../middleware/authMiddleware");
const { updateUser, deleteUser , getUserDashboard} = require("../controllers/userController");

// 🔹 تحديث مستخدم
router.put("/update", protect, authorizeRole("user"), updateUser);

// 🔹 جلب بيانات المستخدم الحالي
router.get("/dashboard", protect, authorizeRole("user"), getUserDashboard)

// 🔹 حذف مستخدم
router.delete("/delete/", protect, authorizeRole("user"), deleteUser);

module.exports = router;



