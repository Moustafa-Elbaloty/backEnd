const Order = require("../models/orderModel");
const Cart = require("../models/cartModel");
const Product = require("../models/productModel");
const paymobService = require("../services/paymobService");

// ==============================
// 🟢 Create Order (Cash / Paymob)
// ==============================
exports.createOrder = async (req, res) => {
  try {
    const { paymentMethod, vendorId } = req.body;

    // 1️⃣ Validate payment method
    if (!["cash", "stripe", "paypal", "paymob"].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    // 2️⃣ Get cart
    const cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.product"
    );

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    // 3️⃣ Remove deleted products
    const validItems = cart.items.filter((item) => item.product !== null);

    if (validItems.length === 0) {
      cart.items = [];
      await cart.save();
      return res.status(400).json({
        success: false,
        message: "All products in cart are no longer available",
      });
    }

    if (validItems.length < cart.items.length) {
      cart.items = validItems.map((item) => ({
        product: item.product._id,
        quantity: item.quantity,
      }));
      await cart.save();
    }

    // 4️⃣ Build order items
    const orderItems = validItems.map((item) => ({
      product: item.product._id,
      quantity: item.quantity,
      price: item.product.price,
      totalItemPrice: item.product.price * item.quantity,
    }));

    // 5️⃣ Calculate total
    const totalPrice = orderItems.reduce(
      (sum, item) => sum + item.totalItemPrice,
      0
    );

    const adminCommission = totalPrice * 0.1;
    const sellerAmount = totalPrice - adminCommission;

    // 6️⃣ Create order
    const order = await Order.create({
      user: req.user.id,
      vendor: vendorId || null,
      items: orderItems,
      paymentMethod,
      totalPrice,
      adminCommission,
      sellerAmount,
      paymentStatus: paymentMethod === "cash" ? "pending" : "pending",
      orderStatus: "pending",
    });

    // 7️⃣ Clear cart
    cart.items = [];
    await cart.save();

    // ======================
    // 🟢 Paymob Payment Flow
    // ======================
    if (paymentMethod === "paymob") {
      const amountCents = Math.round(totalPrice * 100);

      const authToken = await paymobService.getAuthToken();

      const paymobOrder = await paymobService.createOrder(
        authToken,
        amountCents
      );

      const paymentKey = await paymobService.getPaymentKey(
        authToken,
        paymobOrder.id,
        amountCents,
        req.user
      );

      order.paymobOrderId = paymobOrder.id;
      await order.save();

      return res.status(200).json({
        success: true,
        message: "Paymob payment initialized",
        iframeUrl: `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentKey}`,
        orderId: order._id,
      });
    }

    // ======================
    // 🟢 Cash Order Response
    // ======================
    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      order,
    });

  } catch (error) {
    console.error("Create Order Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating order",
      error: error.message,
    });
  }
};

// ==============================
// 🟢 Get My Orders
// ==============================
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate("items.product")
      .populate("vendor");

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// 🟢 Cancel Order (Pending Only)
// ==============================
exports.cancelOrder = async (req, res) => {
  try {
    let order;

    if (req.user.role === "admin") {
      order = await Order.findById(req.params.id);
    } else {
      order = await Order.findOne({
        _id: req.params.id,
        user: req.user.id,
      });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.orderStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending orders can be cancelled",
      });
    }

    order.orderStatus = "cancelled";
    order.paymentStatus = "failed";
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// 🟢 Update Order Status (Admin)
// ==============================
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

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.orderStatus = status;
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order status updated",
      order,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// ==============================
// 🟢 Get All Orders (Admin)
// ==============================
exports.getAllOrders = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const orders = await Order.find()
      .populate("user", "name email")
      .populate("vendor", "name email")
      .populate("items.product", "name price image");

    res.status(200).json({
      success: true,
      data: orders,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// ==============================
// 🟢 Retry Paymob Payment
// ==============================
exports.retryPayment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("user");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // لازم يكون Paymob + Pending
    if (order.paymentMethod !== "paymob") {
      return res.status(400).json({
        success: false,
        message: "This order is not Paymob payment",
      });
    }

    if (order.paymentStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Payment is already completed",
      });
    }

    // 🔁 Create new Paymob payment session
    const amountCents = Math.round(order.totalPrice * 100);

    const authToken = await paymobService.getAuthToken();

    const paymobOrder = await paymobService.createOrder(
      authToken,
      amountCents
    );

    const paymentKey = await paymobService.getPaymentKey(
      authToken,
      paymobOrder.id,
      amountCents,
      order.user
    );

    // تحديث order ببيانات Paymob الجديدة
    order.paymobOrderId = paymobOrder.id;
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Payment retry initialized",
      iframeUrl: `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentKey}`,
    });

  } catch (error) {
    console.error("Retry Payment Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrying payment",
      error: error.message,
    });
  }
};

// ==============================
// 🟢 Get Single Order By ID (Admin)
// ==============================
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("vendor", "name email")
      .populate("items.product", "name price image");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
