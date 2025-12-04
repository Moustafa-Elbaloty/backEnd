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
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id,
    })
      .populate("items.product")
      .populate("vendor");

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🟢 Cancel order (only pending)
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.orderStatus !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending orders can be cancelled" });
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

    // التحقق من الحالة المسموحة
    const allowedStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${allowedStatuses.join(
          ", "
        )}`,
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: "Order not found" });

    order.orderStatus = status;
    await order.save();

    req.io.emit("update-order", {
      message: `Order ${order._id} status updated to ${order.status}`,
      orderId: order._id,
      status: order.status,
    });
    res.json({ message: "Order status updated", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("product", "name price");

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No orders found",
        data: null
      });
    }

    const data = orders.map(order => ({
      ...order._doc,
      sellerAmount: order.amount - order.adminCommission
    }));

    res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      data
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);
    if (!order)
      return res.status(404).json({ message: "Order not found" });

    const user = await User.findById(order.user).select("name email");
    const product = await Product.findById(order.product).select("name price");

    res.status(200).json({order});
  } catch (err) {
    res.status(500).json({ message: "Server error while fetching order" });
  }
};
