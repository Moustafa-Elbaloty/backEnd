const express = require("express")
const router = express.Router();
const { addProduct, updateProduct, deleteProduct, getProducts, getAllProductsAdmin } = require("../controllers/productController")
const { protect } = require("../middleware/authMiddleware");
const {verifyAdmin} = require("../middleware/authMiddleware");


router.post("/addProduct", protect, addProduct)
router.put("/:id", protect, updateProduct)
router.delete("/:id", protect, deleteProduct)
router.get("/adminGetProducts", protect, verifyAdmin, getAllProductsAdmin);

router.get("/", getProducts)

module.exports = router;
