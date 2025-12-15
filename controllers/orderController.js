const Order = require("../models/orderModel");
const Cart = require("../models/cartModel");
const User = require("../models/userModel");
const Product = require("../models/productModel");

// 🟢 Create Order (Checkout)
exports.createOrder = async (req, res) => {
  try {
    const { paymentMethod, vendorId } = req.body;

    // التحقق من paymentMethod
    if (
      !paymentMethod ||
      !["cash", "stripe", "paypal"].includes(paymentMethod)
    ) {
      return res.status(400).json({
        message: "Invalid payment method. Must be: cash, stripe, or paypal",
      });
    }

    const cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.product"
    );

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // فلترة المنتجات المحذوفة أو المش موجودة
    const validItems = cart.items.filter((item) => item.product !== null);

    if (validItems.length === 0) {
      // لو كل المنتجات محذوفة، نظف الكارت
      cart.items = [];
      await cart.save();
      return res.status(400).json({
        message:
          "All products in cart are no longer available. Cart has been cleared.",
      });
    }

    // لو في منتجات محذوفة، نظف الكارت منهم
    if (validItems.length < cart.items.length) {
      cart.items = validItems.map((item) => ({
        product: item.product._id,
        quantity: item.quantity,
      }));
      await cart.save();
    }

    // إنشاء orderItems من المنتجات الصالحة فقط
    const orderItems = validItems.map((item) => ({
      product: item.product._id,
      quantity: item.quantity,
      price: item.product.price,
      totalItemPrice: item.product.price * item.quantity,
    }));

    const totalPrice = orderItems.reduce(
      (total, item) => total + item.totalItemPrice,
      0
    );
const adminCommission = totalPrice * 0.10; // 10%
const sellerAmount = totalPrice - adminCommission;

const order = await Order.create({
  user: req.user.id,
  vendor: vendorId || null,
  items: orderItems,
  paymentMethod,
  totalPrice,
  adminCommission,
  sellerAmount
});


    // تفريغ الكارت بعد إنشاء الطلب
    cart.items = [];
    await cart.save();

req.io.emit("new-order", {
  message: `New order by ${req.user.name}`,
  orderId: order._id,
  amount: order.amount,
});


    res.json({
      message: "Order created successfully",
      order,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🟢 Get all orders for current user
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate("items.product")
      .populate("vendor");

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🟢 Get single order
exports.getOrderById = async (req, res) => {
  try {
    const orderId = req.params.id;

    // جلب الأوردر بدون user أو vendor
    const order = await Order.findById(orderId)
      .populate("items.product", "name price image");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // السماح فقط للأدمن
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied: only admin can view this order",
      });
    }

    // تجهيز البيانات بدون أي user أو vendor
    const orderData = {
      id: order._id,
      items: order.items.map(item => ({
        product: item.product,
        quantity: item.quantity,
        price: item.price,
        totalItemPrice: item.totalItemPrice,
      })),
      totalPrice: order.totalPrice,
      paymentMethod: order.paymentMethod,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      adminCommission: order.adminCommission,
      sellerAmount: order.sellerAmount,
      createdAt: order.createdAt,
    };

    res.status(200).json({
      success: true,
      message: "Order fetched successfully",
      data: orderData,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error while fetching order",
      error: err.message,
    });
  }
};

// 🟢 Cancel order (only pending)
exports.cancelOrder = async (req, res) => {
  try {
    let order;

    if (req.user.role === "admin") {
      order = await Order.findById(req.params.id);
    } 
    else {
      order = await Order.findOne({
        _id: req.params.id,
        user: req.user.id,
      });
    }

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.orderStatus !== "pending") {
      return res.status(400).json({
        message: "Only pending orders can be cancelled",
      });
    }

    order.orderStatus = "cancelled";
    await order.save();

    req.io.emit("order-cancelled", {
      message: `${req.user.name} cancelled order ${order._id}`,
      orderId: order._id,
    });

    res.json({ message: "Order cancelled", order });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// 🟢 Vendor/Admin update status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${allowedStatuses.join(", ")}`,
      });
    }

    // جلب الأوردر من قاعدة البيانات
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const userRole = req.user.role;
    const userId = req.user.id;

    if (userRole === "admin") {
      order.orderStatus = status;
    } else if (userRole === "user" && order.user.toString() === userId) {
      order.orderStatus = status;
    } else {
      return res.status(403).json({
        message: "You do not have permission to update this order status",
      });
    }

    // حفظ التغييرات
    await order.save();

    // إرسال إشعار عبر WebSocket
    req.io.emit("update-order", {
      message: `Order ${order._id} status updated to ${order.orderStatus}`,
      orderId: order._id,
      status: order.orderStatus,
    });

    // الرد على العميل
    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error while updating order status",
      error: err.message,
    });
  }
};
exports.getAllOrders = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Access denied" });

    const { status, paymentStatus, vendorId, userId } = req.query;
    const filter = {};

    if (status) filter.orderStatus = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (vendorId) filter.vendor = vendorId;
    if (userId) filter.user = userId;

    const orders = await Order.find(filter)
      .populate("user", "name email")
      .populate("vendor", "name email")
      .populate("items.product", "name price image");

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No orders found",
        data: null,
      });
    }

    const data = orders.map((order) => ({
      ...order._doc,
      sellerAmount: order.totalPrice - order.adminCommission,
    }));

    res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      data,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


