const Product = require("../models/productModel");

const chatbot = async (req, res, next) => {
    try {
        let { message } = req.body;

        if (!message) {
            return res.status(400).json({ reply: "chatbot.sendMessageRequired" });
        }

        let query = {};

        if (message.includes("موبايل") || message.includes("موبيل")) {
            query.category = "smart phones";
        }
        if (message.includes("الكترونيات") || message.includes("electronics")) {
            query.category = "electronics";
        }

        if (message.includes("سامسونج")) query.brand = "Samsung";
        if (message.includes("شاومي")) query.brand = "Xiaomi";
        if (message.includes("ابل")) query.brand = "Apple";

        const priceMatch = message.match(/(\d{3,6})/);
        if (priceMatch) {
            const price = Number(priceMatch[0]);

            if (message.includes("اقل") || message.includes("تحت")) {
                query.price = { $lte: price };
            } else if (message.includes("اكبر") || message.includes("فوق")) {
                query.price = { $gte: price };
            } else {
                query.price = { $lte: price };
            }
        }

        if (Object.keys(query).length === 0) {
            return res.json({
                reply: "chatbot.unclearRequest",
            });
        }

        const products = await Product.find(query).limit(5);

        if (!products.length) {
            return res.json({
                reply: "chatbot.noResultsFound",
            });
        }

        res.json({
            reply: "chatbot.productsFound",
            products,
        });

    } catch (error) {
        next(error);
    }
};

module.exports = { chatbot };
