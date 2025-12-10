// models/vendorModel.js
const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  filename: { type: String, required: true },        // اسم الملف داخل uploads
  originalName: { type: String, required: true },    // الاسم الأصلي للملف
  mimeType: { type: String, required: true },        // image/png, application/pdf ...
  size: { type: Number, required: true },            // الحجم بالبايت
  field: { type: String, required: true, enum: ["idCard", "commercialReg", "otherDocs"] }, // نوع الحقل
  uploadedAt: { type: Date, default: Date.now },
});

// Vendor schema
const vendorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true }, // كل يوزر له vendor واحد
  storeName: { type: String, required: [true, "Store name is required"], trim: true, minlength: 2 },
  bio: { type: String, trim: true, maxlength: 1000 },

  // قائمة منتجات البائع (references)
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],

  // المستندات المرفوعة للبائع
  documents: [documentSchema],

  // حالة توثيق البائع
  isVerified: { type: Boolean, default: false },
  verifiedAt: { type: Date },

  // إحصاءات بسيطة
  rating: { type: Number, default: 0, min: 0, max: 5 },
  totalReviews: { type: Number, default: 0 },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// مثال virtual: number of documents
vendorSchema.virtual("documentsCount").get(function() {
  return (this.documents && this.documents.length) || 0;
});

// index لتحسين البحث على storeName (اختياري)
vendorSchema.index({ storeName: 1 });

module.exports = mongoose.model("Vendor", vendorSchema);
