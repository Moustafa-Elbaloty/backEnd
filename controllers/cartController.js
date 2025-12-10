const Cart = require("../models/cartModel");
const Product = require("../models/productModel");

// ============================
//       GET CART
// ============================
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.json({
        items: [],
        totalItems: 0,
        totalPrice: 0,
      });
    }

    let totalPrice = 0;
    let totalItems = 0;

    const itemsWithStatus = cart.items.map(item => {
      const prod = item.product;
      const outOfStock = !prod || prod.stock === 0;

      if (prod && prod.price) {
        totalPrice += prod.price * item.quantity;
      }

      totalItems += item.quantity;

      return {
        ...item.toObject ? item.toObject() : item,
        product: prod,
        outOfStock,
      };
    });

    res.json({
      ...cart.toObject(),
      items: itemsWithStatus,
      totalPrice: totalPrice.toFixed(2),
      totalItems,
    });

  } catch (err) {
    res.status(500).json({ message: "cart.serverError" });
  }
};

// ============================
//       ADD TO CART
// ============================
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const { userId } = req.params;

    if (!productId) {
      return res.status(400).json({ message: "cart.productIdRequired" });
    }

    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: "cart.quantityMin" });
    }

    let id = req.user.role === "admin" && userId ? userId : req.user.id;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "cart.productNotFound" });
    }

    if (product.stock === 0) {
      return res.status(400).json({ message: "cart.outOfStock" });
    }

    let cart = await Cart.findOne({ user: id }).populate("items.product");

    if (!cart) {
      if (quantity > product.stock) {
        return res.status(400).json({ message: "cart.stockNotEnough" });
      }

      cart = await Cart.create({
        user: id,
        items: [{ product: productId, quantity }],
      });

      cart = await Cart.findById(cart._id).populate("items.product");
    } else {
      const index = cart.items.findIndex((item) => {
        const existingId = item.product && item.product._id ? item.product._id.toString() : item.product.toString();
        return existingId === productId;
      });

      if (index > -1) {
        const newQty = cart.items[index].quantity + quantity;

        if (newQty > product.stock) {
          return res.status(400).json({ message: "cart.stockExceeded" });
        }

        cart.items[index].quantity = newQty;

      } else {
        if (quantity > product.stock) {
          return res.status(400).json({ message: "cart.stockNotEnough" });
        }

        cart.items.push({ product: productId, quantity });
      }

      await cart.save();
      cart = await Cart.findById(cart._id).populate("items.product");
    }

    let totalPrice = 0;
    let totalItems = 0;

    cart.items.forEach((item) => {
      if (item.product && item.product.price) {
        totalPrice += item.product.price * item.quantity;
        totalItems += item.quantity;
      }
    });

    req.io && req.io.emit("cart-updated", {
      message: `Cart updated for user ${id}`,
      cartId: cart._id,
      totalItems: cart.items.length,
    });

    res.json({
      ...cart.toObject(),
      totalPrice: totalPrice.toFixed(2),
      totalItems,
    });

  } catch (err) {
    res.status(500).json({ message: "cart.serverError" });
  }
};

// ============================
//    UPDATE CART ITEM
// ============================
exports.updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity, userId } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: "cart.quantityMin" });
    }

    let id = req.user.role === "admin" && userId ? userId : req.user.id;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "cart.productNotFound" });
    }

    if (product.stock === 0) {
      return res.status(400).json({ message: "cart.outOfStock" });
    }

    if (quantity > product.stock) {
      return res.status(400).json({ message: "cart.stockNotEnough" });
    }

    const cart = await Cart.findOne({ user: id });

    if (!cart) {
      return res.status(404).json({ message: "cart.cartNotFound" });
    }

    const item = cart.items.find((item) => item.product.toString() === productId);

    if (!item) {
      return res.status(404).json({ message: "cart.productNotFoundInCart" });
    }

    item.quantity = quantity;
    await cart.save();

    const updatedCart = await Cart.findById(cart._id).populate("items.product");

    let totalPrice = 0;
    let totalItems = 0;

    updatedCart.items.forEach((item) => {
      if (item.product && item.product.price) {
        totalPrice += item.product.price * item.quantity;
        totalItems += item.quantity;
      }
    });

    req.io && req.io.emit("cart-updated", {
      message: `Cart updated for user ${id}`,
      cartId: cart._id,
      totalItems: updatedCart.items.length,
    });

    res.json({
      ...updatedCart.toObject(),
      totalPrice: totalPrice.toFixed(2),
      totalItems,
    });

  } catch (err) {
    res.status(500).json({ message: "cart.serverError" });
  }
};

// ============================
//     REMOVE ITEM
// ============================
exports.removeFromCart = async (req, res) => {
  try {
    const { productId, userId } = req.params;
    const id = req.user.role === "admin" && userId ? userId : req.user.id;

    const cart = await Cart.findOneAndUpdate(
      { user: id },
      { $pull: { items: { product: productId } } },
      { new: true }
    ).populate("items.product");

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.json({ items: [], totalItems: 0, totalPrice: 0 });
    }

    let totalPrice = 0;
    let totalItems = 0;

    cart.items.forEach(item => {
      if (item.product && item.product.price) {
        totalPrice += item.product.price * item.quantity;
        totalItems += item.quantity;
      }
    });

    req.io.emit("cart-item-removed", {
      message: `Item removed from cart for user ${id}`,
      cartId: cart._id,
      totalItems: cart.items.length,
    });

    res.json({
      ...cart.toObject(),
      totalPrice: totalPrice.toFixed(2),
      totalItems,
    });

  } catch (err) {
    res.status(500).json({ message: "cart.serverError" });
  }
};

// ============================
//     GET ALL CARTS (ADMIN)
// ============================
exports.getAllCarts = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "cart.noPermission" });
    }

    const carts = await Cart.find()
      .populate("user", "name email role")
      .populate("items.product", "name price image")
      .lean();

    const cartsWithTotal = carts.map(cart => {
      const items = cart.items || [];
      const totalAmount = items.reduce((sum, item) => {
        return sum + (item.product?.price || 0) * item.quantity;
      }, 0);
      return { ...cart._doc, totalAmount };
    });

    res.status(200).json({
      success: true,
      carts: cartsWithTotal
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "cart.serverError",
    });
  }
};

// ============================
//     DELETE CART (ADMIN)
// ============================
exports.deleteCart = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "cart.noPermission" });
    }

    const { cartId } = req.params;

    if (!cartId) {
      return res.status(400).json({ message: "cart.cartIdRequired" });
    }

    const cart = await Cart.findOneAndDelete({ _id: cartId });

    if (!cart) {
      return res.status(404).json({ message: "cart.cartNotFound" });
    }

    res.status(200).json({ success: true, message: "cart.cartDeleted" });

  } catch (err) {
    res.status(500).json({ message: "cart.serverError" });
  }
};
