const axios = require("axios");

const BASE_URL = "https://accept.paymob.com/api";

exports.getAuthToken = async () => {
  const res = await axios.post(`${BASE_URL}/auth/tokens`, {
    api_key: process.env.PAYMOB_API_KEY,
  });
  return res.data.token;
};

exports.createOrder = async (authToken, amountCents) => {
  const res = await axios.post(`${BASE_URL}/ecommerce/orders`, {
    auth_token: authToken,
    delivery_needed: false,
    amount_cents: amountCents,
    currency: "EGP",
    items: [],
  });
  return res.data;
};

exports.getPaymentKey = async (authToken, orderId, amountCents, user) => {
  const res = await axios.post(`${BASE_URL}/acceptance/payment_keys`, {
    auth_token: authToken,
    amount_cents: amountCents,
    expiration: 3600,
    order_id: orderId,
    currency: "EGP",
    integration_id: process.env.PAYMOB_INTEGRATION_ID,
    billing_data: {
      first_name: user?.name || "User",
      last_name: "Paymob",
      email: user?.email || "test@paymob.com",
      phone_number: user?.phone || "01000000000",
      apartment: "NA",
      floor: "NA",
      street: "NA",
      building: "NA",
      city: "Cairo",
      country: "EG",
      state: "Cairo",
      zip_code: "00000",
    },
  });

  return res.data.token;
};
