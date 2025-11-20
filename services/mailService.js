const transporter = require("../config/mailer");

async function sendMail({ to, subject, template, data }) {
  try {
    const info = await transporter.sendMail({
      from: `"Smart Blood Donation" <${process.env.MAIL_USER}>`,
      to,
      subject,
      template, // tên file .hbs
      context: data, // truyền vào template như $data bên Laravel
    });

    console.log("📩 Email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Mail error:", error);
    return false;
  }
}

module.exports = { sendMail };
