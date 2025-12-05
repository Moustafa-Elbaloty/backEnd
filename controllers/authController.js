const User = require("../models/userModel");
const vendorModel = require("../models/vendorModel"); // إضافة مهمة
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "10d" });
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "الرجاء ملأ باقى الحقول" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "بريدك مسجل مسبقا" });
    }

    const user = await User.create({ name, email, password, phone });


    const verificationToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    //  تكوين لينك التفعيل
    const verificationURL = `${req.protocol}://${req.get(
      "host"
    )}/api/auth/verify-email/${verificationToken}`;

    await sendEmail({
      to: user.email,
      subject: "تفعيل حسابك",
      text: `من فضلك فعّل حسابك عبر الرابط التالي: ${verificationURL}`,
      html: `<p>من فضلك فعّل حسابك عبر الضغط على الرابط التالي:</p>
             <a href="${verificationURL}">${verificationURL}</a>`,
    });

    res.status(201).json({
      message: "تم إنشاء الحساب، من فضلك افحص بريدك لتفعيل الحساب",
    });
  } catch (error) {
    res.status(500).json({
      message: "حدث خطأ الرجاء اعاده المحاوله",
      error: error.message,
    });
  }
};



// login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ message: "الرجاء التسجيل اولا " });
    }

    if (!user.isEmailVerified) {
      return res.status(400).json({
        message: "يرجى تفعيل حسابك عبر البريد الإلكتروني قبل تسجيل الدخول",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "يوجد بيانات خطأ " });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    res.status(500).json({
      message: "حدث خطأ الرجاء اعاده المحاوله",
      error: error.message,
    });
  }
};
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "رابط التفعيل غير صالح أو منتهي الصلاحية" });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ message: "تم تفعيل الإيميل بنجاح، يمكنك تسجيل الدخول الآن" });
  } catch (error) {
    res.status(500).json({
      message: "حدث خطأ أثناء تفعيل الإيميل",
      error: error.message,
    });
  }
};


// Admin verifies vendor
const verifyVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;

    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Only admin can verify vendors" });
    }

    const vendor = await vendorModel.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    vendor.verified = true;
    await vendor.save();

    res.status(200).json({
      success: true,
      message: "Vendor verified successfully",
      data: vendor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error verifying vendor",
      error: error.message,
    });
  }
};


module.exports = { registerUser, loginUser, verifyVendor, verifyEmail };
