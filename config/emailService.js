const { Resend } = require("resend");
require("dotenv").config();

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, body) => {
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "your-email@yourdomain.com", // Use environment variable if available
      to,
      subject,
      html: body, // Using HTML for better formatting
    });

    console.log(`✅ Email berhasil dikirim ke ${to}`);
    return true;
  } catch (error) {
    console.error("❌ Gagal mengirim email:", error);
    return false;
  }
};

module.exports = { sendEmail };
