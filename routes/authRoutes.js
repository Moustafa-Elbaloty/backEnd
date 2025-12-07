const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  verifyEmail, resetPassword, forgotPassword, changePassword
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/verify-email/:token", verifyEmail);

router.post("/forgot-password", forgotPassword);

router.put("/reset-password/:token", resetPassword);

router.put("/change-password", protect, changePassword);

router.get("/profile", protect, (req, res) => {
  res.json({
    message: `مرحبًا يا ${req.user.name} `,
    email: req.user.email,
    role: req.user.role,
  });
});

module.exports = router;
