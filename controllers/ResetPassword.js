const crypto = require("crypto")
const bcrypt = require("bcrypt");
// const {email} = require("express-validator"); // <<< DÒNG NÀY PHẢI ĐƯỢC XÓA
const { User } = require("../models");
const nodemailer = require("nodemailer");

const ResetPasswordController = {
    async hash_reset(req, res) {
  const { email } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Thay đổi từ 404 sang 200 để tránh leak thông tin user nào tồn tại
      return res.json({
        status: true, 
        message: "Nếu email tồn tại, link reset mật khẩu đã được gửi.",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    // Save token and expiry to user (make sure your User model has these fields)
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // Send email with reset link
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_SERVICE,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const resetUrl = `${process.env.URL_SERVER}/reset-password?token=${resetToken}`;
    await transporter.sendMail({
      from: '"Support" <support@example.com>',
      to: email,
      subject: "Password Reset",
      html: `<b>Click <a href="${resetUrl}">here</a> to reset your password.</b>`,
    });

    return res.json({
      status: true,
      message: "Password reset link sent to email.",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Lỗi hệ thống khi gửi link reset.",
      error: error.message,
    });
  }
}
};
module.exports = ResetPasswordController;