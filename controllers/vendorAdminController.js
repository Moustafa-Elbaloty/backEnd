const User = require("../models/userModel");

// Get pending vendors
const getPendingVendors = async (req, res) => {
  try {
    const vendors = await User.find({
      role: "vendor",
      vendorStatus: "pending"
    }).select("-password");

    res.status(200).json(vendors);
  } catch (err) {
    res.status(500).json({ message: "Failed to load pending vendors" });
  }
};

// Approve vendor
const approveVendor = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, {
      vendorStatus: "approved"
    });

    res.json({ message: "Vendor approved successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to approve vendor" });
  }
};

// Reject vendor
const rejectVendor = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, {
      vendorStatus: "rejected"
    });

    res.json({ message: "Vendor rejected successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to reject vendor" });
  }
};

module.exports = {
  getPendingVendors,
  approveVendor,
  rejectVendor
};
