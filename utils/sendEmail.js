// utils/sendEmail.js
const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, text, html }) => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_FROM || `"My Shop" <support@teamnti.com>`,
        to,
        subject,
        text,
        html,
    };

    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
