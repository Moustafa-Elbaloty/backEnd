const express = require("express");
const router = express.Router();
const Order = require("../models/orderModel");

/* ===========================
   1️⃣ Webhook (POST)
   Paymob → Backend
=========================== */
router.post("/webhook", async (req, res) => {
  try {
    const data = req.body.obj;

    if (data?.success === true) {
      const order = await Order.findOne({
        paymobOrderId: data.order.id,
      });

      if (order) {
        order.paymentStatus = "paid";
        order.orderStatus = "processing";
        order.paymobTransactionId = data.id;
        await order.save();
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Paymob Webhook Error:", err);
    res.sendStatus(500);
  }
});

/* ===========================
   2️⃣ Callback (GET)
   Paymob → User Browser
=========================== */
router.get("/callback", async (req, res) => {
  const { success, id } = req.query;

  if (success === "true") {
    // 🟢 نجاح الدفع → رجوع للهوم
    return res.redirect("http://localhost:4200/");
    // أو:
    // return res.redirect("http://localhost:4200/payment-success");
  }

  // 🔴 فشل الدفع
  return res.redirect("http://localhost:4200/payment-failed");
});

module.exports = router;
