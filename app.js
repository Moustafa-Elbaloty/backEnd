const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const cors = require("cors");
dotenv.config();
const PORT = process.env.PORT || 5000;
const app = express();
app.use(express.json());


app.use(cors({
  origin: "http://localhost:4200",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

connectDB();


const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

const vendorRoutes = require("./routes/vendorRoutes");
app.use("/api/vendor", vendorRoutes);

const productRoutes = require("./routes/productRoutes");
app.use("/api/products", productRoutes);



const chatbotRoutes = require("./routes/chatbotRoutes");
app.use("/api/chat", chatbotRoutes);
// 🛒 مسارات الكارت
const cartRoutes = require("./routes/cartRoutes");
app.use("/api/cart", cartRoutes);

// 📦 مسارات الطلبات
const orderRoutes = require("./routes/orderRoutes");
app.use("/api/orders", orderRoutes);

// 💳 مسارات الدفع
const paymentRoutes = require("./routes/paymentRoutes");
app.use("/api/payment", paymentRoutes);

app.listen(PORT, () => console.log(` Server running on port ${PORT}`));
