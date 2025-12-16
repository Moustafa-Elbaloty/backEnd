const express = require("express");
const router = express.Router();
const { registerUser, loginUser, verifyEmail, resetPassword, forgotPassword, changePassword, logout } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { googleLogin } = require("../controllers/authController");

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/verify-email/:token", verifyEmail);

router.post("/forgot-password", forgotPassword);

router.put("/reset-password/:token", resetPassword);

router.put("/change-password", protect, changePassword);

router.post("/logout", protect, logout);


router.post("/google", googleLogin);


module.exports = router;
