const vendorModel = require("../models/vendorModel");
const userModel = require("../models/userModel");
const productModel = require("../models/productModel");
const mongoose = require("mongoose");

const cloudinary = require("../config/cloudinary");


// ===============================
// Helper: upload Base64 to Cloudinary (Node safe)
// ===============================
const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

// ===============================
// Create Vendor
// ===============================
const createVendor = async (req, res) => {
  try {
    const { storeName } = req.body;

    if (!storeName) {
      return res.status(400).json({
        success: false,
        message: "storeName is required",
      });
    }

    if (!req.files?.idCard || !req.files?.commercialReg) {
      return res.status(400).json({
        success: false,
        message: "idCard and commercialReg are required",
      });
    }

    // ===============================
    // 🔒 FILE VALIDATION (IMPORTANT)
    // ===============================
    const idCardFile = req.files.idCard[0];
    const commercialRegFile = req.files.commercialReg[0];

    // idCard لازم صورة
    if (!idCardFile.mimetype.startsWith("image/")) {
      return res.status(400).json({
        success: false,
        message: "idCard must be an image (jpg, png, etc.)",
      });
    }

    // commercialReg لازم PDF فقط
    if (commercialRegFile.mimetype !== "application/pdf") {
      return res.status(400).json({
        success: false,
        message: "commercialReg must be a PDF file",
      });
    }

    const existingVendor = await vendorModel.findOne({ user: req.user.id });
    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: "You already have a vendor account",
      });
    }

    // ===============================
    // 🖼️ Upload idCard (IMAGE)
    // ===============================
    const idCardUpload = await uploadBufferToCloudinary(
      idCardFile.buffer,
      {
        folder: "vendors/id-cards",
        resource_type: "image",
      }
    );

    // ===============================
    // 📄 Upload commercialReg (PDF)
    // ===============================
    const commercialRegUpload = await uploadBufferToCloudinary(
      commercialRegFile.buffer,
      {
        folder: "vendors/commercial-reg",
        resource_type: "raw",
      }
    );

    // ===============================
    // 📎 otherDocs (optional)
    // ===============================
    const uploadedOtherDocs = [];

    if (req.files.otherDocs) {
      for (const file of req.files.otherDocs) {
        const uploaded = await uploadBufferToCloudinary(file.buffer, {
          folder: "vendors/other-docs",
          resource_type:
            file.mimetype === "application/pdf" ? "raw" : "image",
        });

        uploadedOtherDocs.push({
          field: "otherDocs",
          filename: uploaded.public_id,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        });
      }
    }

    // ===============================
    // Create Vendor
    // ===============================
    const vendor = await vendorModel.create({
      user: req.user.id,
      storeName,
      documents: [
        {
          field: "idCard",
          filename: idCardUpload.public_id,
          originalName: idCardFile.originalname,
          mimeType: idCardFile.mimetype,
          size: idCardFile.size,
        },
        {
          field: "commercialReg",
          filename: commercialRegUpload.public_id,
          originalName: commercialRegFile.originalname,
          mimeType: commercialRegFile.mimetype,
          size: commercialRegFile.size,
        },
        ...uploadedOtherDocs,
      ],
      isVerified: false,
    });

    await userModel.findByIdAndUpdate(req.user.id, { role: "vendor" });

    res.status(201).json({
      success: true,
      message: "Vendor account created successfully",
      data: vendor,
    });
  } catch (error) {
    console.error("Create Vendor Error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating vendor",
      error: error.message,
    });
  }
};




// =====================
// Get Vendor Profile
// =====================
const getVendorProfile = async (req, res) => {
  try {
    const vendor = await vendorModel
      .findOne({ user: req.user.id })
      .populate("user", "name email role");

    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    res.status(200).json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching vendor profile",
      error: error.message,
    });
  }
};

// =====================
// Update Vendor
// =====================
const updateVendor = async (req, res) => {
  try {
    const { storeName } = req.body;

    const vendor = await vendorModel.findOne({ user: req.user.id });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    if (storeName) vendor.storeName = storeName;

    // 🖼️ Update idCard
    if (req.files?.idCard) {
      const uploaded = await uploadBufferToCloudinary(
        req.files.idCard[0].buffer,
        {
          folder: "vendors/id-cards",
          resource_type: "image",
        }
      );
      vendor.documents.idCard = uploaded.secure_url;
    }

    // 📄 Update commercialReg
    if (req.files?.commercialReg) {
      const uploaded = await uploadBufferToCloudinary(
        req.files.commercialReg[0].buffer,
        {
          folder: "vendors/commercial-reg",
          resource_type: "raw",
        }
      );
      vendor.documents.commercialReg = uploaded.secure_url;
    }

    // 📎 Update otherDocs
    if (req.files?.otherDocs) {
      for (const file of req.files.otherDocs) {
        const uploaded = await uploadBufferToCloudinary(file.buffer, {
          folder: "vendors/other-docs",
          resource_type:
            file.mimetype === "application/pdf" ? "raw" : "image",
        });
        vendor.documents.otherDocs.push(uploaded.secure_url);
      }
    }

    await vendor.save();

    res.status(200).json({
      success: true,
      message: "Vendor updated successfully",
      data: vendor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating vendor",
      error: error.message,
    });
  }
};


// =====================
// Get Vendor Products
// =====================
const getVendorProducts = async (req, res) => {
  try {
    const vendor = await vendorModel
      .findOne({ user: req.user.id })
      .populate({
        path: "products",
        options: { sort: { createdAt: -1 } }
      });


    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    res.status(200).json({
      success: true,
      count: vendor.products.length,
      data: vendor.products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching vendor products",
      error: error.message,
    });
  }
};

// =====================
// Vendor Dashboard
// =====================
const getVendorDashboard = async (req, res) => {
  try {
    const vendor = await vendorModel
      .findOne({ user: req.user.id })
      .populate("user", "name email");

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const products = await productModel.find({ vendor: vendor._id });

    const totalProducts = products.length;
    const totalStock = products.reduce((acc, p) => acc + (p.stock || 0), 0);
    const totalValue = products.reduce(
      (acc, p) => acc + (p.price * (p.stock || 0) || 0),
      0
    );

    res.status(200).json({
      success: true,
      message: `Welcome ${vendor.storeName}!`,
      stats: { totalProducts, totalStock, totalValue },
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching vendor dashboard",
      error: error.message,
    });
  }
};


const getAllVendors = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Access denied" });

    const vendors = await vendorModel.find().populate("user", "name email role");

    res.status(200).json({
      success: true,
      message: "All vendors fetched successfully",
      data: vendors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching vendors",
      error: error.message,
    });
  }
};

// =====================
// Delete Vendor
// =====================
const deleteVendor = async (req, res) => {
  try {
    const vendor = await vendorModel.findOne({ user: req.user.id });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    await productModel.deleteMany({ vendor: vendor._id });
    await vendorModel.deleteOne({ _id: vendor._id });
    await userModel.findByIdAndUpdate(vendor.user, { role: "user" });

    res.status(200).json({
      success: true,
      message: "Vendor deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting vendor",
      error: error.message,
    });
  }
};

module.exports = {
  getAllVendors,

  createVendor,
  getVendorProfile,
  updateVendor,
  deleteVendor,
  getVendorProducts,
  getVendorDashboard,
};
