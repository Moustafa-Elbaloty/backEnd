const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const protect = async (req, res, next) => {
  try {
    // 1️⃣ تأكد من وجود Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "🔒 غير مصرح لك بالدخول، مفيش توكن",
      });
    }

    // 2️⃣ استخراج التوكن
    const token = authHeader.split(" ")[1];

    // 3️⃣ التحقق من التوكن
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4️⃣ جلب المستخدم
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "❌ المستخدم غير موجود",
      });
    }

    // 5️⃣ التحقق من Blacklist
    const isBlacklisted = user.blacklistedTokens?.some(
      (item) => item.token === token
    );

    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: "❌ تم تسجيل الخروج، من فضلك سجل دخول مرة أخرى",
      });
    }

    // 6️⃣ إرفاق المستخدم بالـ request
    req.user = user;

    next();
  } catch (error) {
    console.error("JWT Error:", error.message);

    return res.status(401).json({
      success: false,
      message:
        error.name === "TokenExpiredError"
          ? "❌ التوكن منتهي الصلاحية"
          : "❌ توكن غير صالح",
    });
  }
};

module.exports = { protect };
