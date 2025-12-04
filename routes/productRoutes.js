const express = require("express")
const router = express.Router();
const multer = require('multer');
const path = require("path");
const { addProduct, updateProduct, deleteProduct, getProducts, getAllProductsAdmin, getProductByID } = require("../controllers/productController")
const { protect } = require("../middleware/authMiddleware");
const {verifyAdmin} = require("../middleware/authMiddleware");


// ---------------- Multer setup ----------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads')); // ../uploads
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    cb(null, Date.now() + '-' + base + ext);
  }
});

const fileFilter = (req, file, cb) => {
  // السماح بصيغ الصور فقط
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // حد 5MB مثلاً
});
// -----------------------------------------------




// إضافة منتج مع صورة: نفّذ حماية المستخدم أولاً ثم multer ثم controller
router.post("/addProduct", protect, upload.single('image'), addProduct);
router.put("/:id", protect, updateProduct)
router.delete("/:id", protect, deleteProduct)
router.get("/adminGetProducts", protect, verifyAdmin, getAllProductsAdmin);
router.get("/getProductByID", protect, verifyAdmin, getProductByID);

router.get("/", getProducts)

module.exports = router;
