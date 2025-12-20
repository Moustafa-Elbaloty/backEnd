const productModel = require("../models/productModel");
const vendorModel = require("../models/vendorModel");
const cloudinary = require("../config/cloudinary");

// ===============================
// Helper: upload buffer to Cloudinary
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
// ➕ Add Product
// ===============================
const addProduct = async (req, res) => {
  try {
    if (!req.user || (req.user.role !== "vendor" && req.user.role !== "admin")) {
      return res.status(403).json({
        success: false,
        message: "Only vendors or admins can add products",
      });
    }

    const { name, price, description, category, stock, brand } = req.body;

    const missing = [];
    if (!name) missing.push("name");
    if (!price) missing.push("price");
    if (!description) missing.push("description");
    if (!category) missing.push("category");
    if (stock == null || stock === "") missing.push("stock");
    if (!brand) missing.push("brand");
    if (!req.file) missing.push("image");

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        missingFields: missing,
      });
    }

    const priceNumber = Number(price);
    const stockNumber = Number(stock);

    if (Number.isNaN(priceNumber) || priceNumber < 0) {
      return res.status(400).json({ success: false, message: "Invalid price" });
    }

    if (!Number.isInteger(stockNumber) || stockNumber < 0) {
      return res.status(400).json({ success: false, message: "Invalid stock" });
    }

    // 🔥 Upload image (buffer)
    const uploadedImage = await uploadBufferToCloudinary(req.file.buffer, {
      folder: "products",
      resource_type: "image",
    });

    const vendor = await vendorModel.findOne({ user: req.user.id });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const product = await productModel.create({
      name: name.trim(),
      price: priceNumber,
      description: description.trim(),
      category: category.trim(),
      stock: stockNumber,
      brand: brand.trim(),
      image: uploadedImage.secure_url,
      vendor: vendor._id,
    });

    vendor.products.push(product._id);
    await vendor.save();

    if (req.io) {
      req.io.emit("new-product", {
        message: `New product added: ${product.name}`,
        productId: product._id,
      });
    }

    res.status(201).json({
      success: true,
      message: "Product added successfully",
      data: product,
    });
  } catch (error) {
    console.error("Add Product Error:", error);
    res.status(500).json({
      success: false,
      message: "Error adding product",
      error: error.message,
    });
  }
};

// ===============================
// ✏️ Update Product
// ===============================
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await productModel.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const vendor = await vendorModel.findOne({ user: req.user.id });
    if (
      req.user.role !== "admin" &&
      product.vendor.toString() !== vendor._id.toString()
    ) {
      return res.status(403).json({
        message: "You can only update your own products",
      });
    }

    // 🔥 update image if exists
    if (req.file) {
      try {
        if (product.image) {
          const publicId = product.image
            .split("/")
            .slice(-2)
            .join("/")
            .split(".")[0];
          await cloudinary.uploader.destroy(publicId);
        }
      } catch (e) {
        console.warn("Old image delete failed:", e.message);
      }

      const uploaded = await uploadBufferToCloudinary(req.file.buffer, {
        folder: "products",
        resource_type: "image",
      });

      product.image = uploaded.secure_url;
    }

    Object.assign(product, req.body);
    const updatedProduct = await product.save();

    if (req.io) {
      req.io.emit("update-product", {
        message: `Product updated: ${updatedProduct.name}`,
        productId: updatedProduct._id,
      });
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating product",
      error: error.message,
    });
  }
};

// ===============================
// ❌ Delete Product
// ===============================
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await productModel.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const vendor = await vendorModel.findOne({ user: req.user.id });
    if (
      req.user.role !== "admin" &&
      product.vendor.toString() !== vendor._id.toString()
    ) {
      return res.status(403).json({
        message: "You can only delete your own products",
      });
    }

    if (product.image) {
      try {
        const publicId = product.image
          .split("/")
          .slice(-2)
          .join("/")
          .split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (e) {
        console.warn("Cloudinary delete failed:", e.message);
      }
    }

    await productModel.findByIdAndDelete(id);

    await vendorModel.findByIdAndUpdate(product.vendor, {
      $pull: { products: product._id },
    });

    if (req.io) {
      req.io.emit("delete-product", {
        message: `Product deleted: ${product.name}`,
        productId: product._id,
      });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting product",
      error: error.message,
    });
  }
};


//  Get All Products (pagination + filtering + sorting) //
const getProducts = async (req, res) => {
  try {
    // --pagination-- //

    //  Get current page and limit (with default values and safe range) //
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 12, 100);
    // products to skip //
    const skip = (page - 1) * limit;

    // --filtering-- //

    const filter = {};

    // Filter by category (exact match) //
    if (req.query.category) filter.category = req.query.category;

    // Filter by price range (min and/or max) //
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
    }

    // Full-text search (on name, description, etc.) //
    if (req.query.q) {
      filter.name = { $regex: req.query.q, $options: 'i' };
    }
    // --sorting --//

    const sortField = req.query.sort || "createdAt";
    const sortOrder = req.query.order === "desc" ? -1 : 1;

    // Run product search and total count at the same time for efficiency //
    const [products, total] = await Promise.all([
      productModel.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .populate("vendor", "storeName email"),
      productModel.countDocuments(filter),
    ]);

    // أضف حالة outOfStock لكل منتج
    const productsWithStatus = products.map(p => ({
      ...p.toObject(),
      outOfStock: p.stock === 0
    }));

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      total,          // total products matching the filter
      page,           // current page
      limit,          // products per page
      totalPages,     // total number of pages
      count: products.length, // number of products in this page
      hasNextPage,
      hasPrevPage,
      products: productsWithStatus // actual products data with outOfStock flag
    })


  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching products", error: error.message, });
  }
};

const getAllProductsAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Access denied" });
    const products = await productModel.find().populate('vendor', 'name email');
    res.status(200).json({
      success: true,
      message: "All products fetched",
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: error.message
    });
  }
};

const getProductByID = async (req, res) => {
  try {
    const { id } = req.params;

    // جلب المنتج مع معلومات البائع
    const product = await productModel.findById(id).populate('vendor', 'name email');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // 🔥 Check stock
    if (product.stock === 0) {
      return res.status(200).json({
        success: true,
        message: "Product is out of stock",
        outOfStock: true,
        data: product
      });
    }

    res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching product",
      error: error.message
    });
  }
};


module.exports = { addProduct, updateProduct, deleteProduct, getProducts, getAllProductsAdmin, getProductByID };
