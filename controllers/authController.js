const User = require("../models/userModel");
const vendorModel = require("../models/vendorModel");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const i18n = require("i18n");

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "10d" });
};

// ============================
//       REGISTER USER
// ============================
const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: req.t("auth.fillFields") });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: req.t("auth.emailRegistered") });
    }

    const user = await User.create({ name, email, password, phone });

    const verificationToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    const verificationURL = `${req.protocol}://${req.get(
      "host"
    )}/api/auth/verify-email/${verificationToken}`;

    await sendEmail({
      to: user.email,
      subject: req.t("auth.verifyEmailSubject"),
      text: `${req.t("auth.verifyEmailText")} ${verificationURL}`,
      html: `
        <p>${req.t("auth.verifyEmailText")}</p>
        <a href="${verificationURL}" style="padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none;">
          ${req.t("auth.clickHere")}
        </a>
      `,
    });

    res.status(201).json({
      message: req.t("auth.registerGreeting"),
    });

  } catch (error) {
    res.status(500).json({
      message: req.t("auth.serverError"),
      error: error.message,
    });
  }
};

// ============================
//           LOGIN
// ============================
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({ message: req.t("auth.emailNotFound") });
    }

    if (!user.isEmailVerified) {
      return res.status(400).json({ message: req.t("auth.verifyEmailFirst") });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: req.t("auth.wrongPassword") });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
      message: req.t("auth.loginSuccess")
    });

  } catch (error) {
    res.status(500).json({
      message: req.t("auth.serverError"),
      error: error.message,
    });
  }
};

// ============================
//        VERIFY EMAIL
// ============================
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: req.t("auth.invalidOrExpiredToken") });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    res.json({ message: req.t("auth.emailVerifiedSuccess") });

  } catch (error) {
    res.status(500).json({
      message: req.t("auth.verifyEmailError"),
      error: error.message,
    });
  }
};

// ============================
//       FORGOT PASSWORD
// ============================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: req.t("auth.emailRequired") });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: req.t("auth.emailNotFound") });
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetURL = `${req.protocol}://${req.get(
      "host"
    )}/api/auth/reset-password/${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: req.t("auth.resetPasswordSubject"),
      text: `${req.t("auth.resetPasswordText")} ${resetURL}`,
    });

    res.json({ message: req.t("auth.resetEmailSent") });

  } catch (error) {
    res.status(500).json({
      message: req.t("auth.serverError"),
      error: error.message,
    });
  }
};

// ============================
//       RESET PASSWORD
// ============================
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: req.t("auth.passwordRequired") });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: req.t("auth.passwordMinLength") });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: req.t("auth.invalidOrExpiredToken") });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    res.json({ message: req.t("auth.passwordResetSuccess") });

  } catch (error) {
    res.status(500).json({
      message: req.t("auth.serverError"),
      error: error.message,
    });
  }
};

// ============================
//       CHANGE PASSWORD
// ============================
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ message: req.t("auth.fillFields") });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: req.t("auth.passwordNotMatch") });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: req.t("auth.passwordMinLength") });
    }

    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      return res.status(404).json({ message: req.t("auth.userNotFound") });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: req.t("auth.wrongPassword") });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      message: req.t("auth.passwordChanged"),
      token: generateToken(user._id, user.role),
    });

  } catch (error) {
    res.status(500).json({
      message: req.t("auth.serverError"),
      error: error.message,
    });
  }
};

// ============================
//       VERIFY VENDOR (ADMIN)
// ============================
const verifyVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: req.t("auth.adminOnly") });
    }

    const vendor = await vendorModel.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({ message: req.t("auth.vendorNotFound") });
    }

    vendor.verified = true;
    await vendor.save();

    res.json({
      message: req.t("auth.vendorVerified"),
      data: vendor,
    });

  } catch (error) {
    res.status(500).json({
      message: req.t("auth.serverError"),
      error: error.message,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  verifyVendor,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword
};
