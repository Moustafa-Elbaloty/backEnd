const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  registerUser,
  registerVendor,
  loginUser,
  verifyEmail,
  resetPassword,
  forgotPassword,
  changePassword,
  logout
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

const upload = multer({
  dest: "uploads/vendors"
});



router.post("/register-user", registerUser);

router.post(
  "/register-vendor",
  upload.fields([
    { name: "idCard", maxCount: 1 },
    { name: "commercialRegister", maxCount: 1 }
  ]),
  registerVendor
);


router.post("/login", loginUser);
router.get("/verify-email/:token", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:token", resetPassword);

router.put("/change-password", protect, changePassword);
router.post("/logout", protect, logout);

module.exports = router;
