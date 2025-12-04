const User = require("../models/userModel");
const vendorModel = require("../models/vendorModel"); // إضافة مهمة
const jwt = require("jsonwebtoken");

// إنشاء التوكن
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "10d" });
};

// register
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "يا نجم كمل باقى الحقول" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "بريدك متسجل عندنا يا زعامه" });
    }

    const user = await User.create({ name, email, password, role });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    res.status(500).json({
      message: "معلش فى مشكله عندك ف النت ههه",
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
        .json({ message: "روح سجل حساب يا صاحبى هستناك" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "كلمه السر غلط يا زعيم" });
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
      message: "ارجع يا نجم فى مشكله عيد من حبيبنا",
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


module.exports = { registerUser, loginUser, verifyVendor };
