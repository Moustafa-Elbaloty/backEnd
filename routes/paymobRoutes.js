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
  const { success, order } = req.query;

  if (success === "true") {
    // 🟢 نجاح الدفع
    return res.redirect(
      `http://localhost:4200/payment-result?status=success`
    );
  }

  // 🔴 فشل الدفع
  return res.redirect(
    `http://localhost:4200/payment-result?status=failed`
  );
});

module.exports = router;
