const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");

      // 👇 أضف الشيك على الـ Blacklist هنا
      const isBlacklisted = req.user.blacklistedTokens.some(
        (item) => item.token === token
      );

      if (isBlacklisted) {
        return res.status(401).json({
          success: false,
          message: "❌ تم تسجيل الخروج، من فضلك سجل دخول مرة أخرى",
        });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({
        success: false,
        message: "❌ التوكن منتهي الصلاحية",
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "🔒 غير مصرح لك بالدخول، مفيش توكن",
    });
  }
};


module.exports = { protect };