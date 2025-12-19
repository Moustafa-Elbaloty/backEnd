const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = express();

// ==============================
// 🟢 Middlewares
// ==============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make uploads folder public
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// CORS
app.use(
  cors({
    origin: "http://localhost:4200",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ==============================
// 🟢 Database
// ==============================
connectDB();

// ==============================
// 🟢 HTTP + Socket.io
// ==============================
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:4200",
    methods: ["GET", "POST"],
  },
});

// Attach io to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Socket events
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// ==============================
// 🟢 Routes
// ==============================

// Auth
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

// Vendor
const vendorRoutes = require("./routes/vendorRoutes");
app.use("/api/vendor", vendorRoutes);

// Products
const productRoutes = require("./routes/productRoutes");
app.use("/api/products", productRoutes);

// Chatbot
const chatbotRoutes = require("./routes/chatbotRoutes");
app.use("/api/chat", chatbotRoutes);

// Cart
const cartRoutes = require("./routes/cartRoutes");
app.use("/api/cart", cartRoutes);

// Orders
const orderRoutes = require("./routes/orderRoutes");
app.use("/api/orders", orderRoutes);

// Admin
const adminRoutes = require("./routes/adminRoutes");
app.use("/api/admin", adminRoutes);

// Users
const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

// Payments (existing)
const paymentRoutes = require("./routes/paymentRoutes");
app.use("/api/payment", paymentRoutes);

// 🟢 Paymob Webhook (NEW)
const paymobRoutes = require("./routes/paymobRoutes");
app.use("/api/paymob", paymobRoutes);

// ==============================
// 🟢 Start Server
// ==============================
server.listen(PORT, () => {
  console.log(`🚀 Server + Socket.io running on port ${PORT}`);
});
