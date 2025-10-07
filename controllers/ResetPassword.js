const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const { User } = require("../models");
const nodemailer = require("nodemailer");


exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

 
    if (!user) {
      return res.json({
        status: true,
        message: "Nếu email tồn tại, link reset mật khẩu đã được gửi.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 giờ

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

   
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_SERVICE,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: { rejectUnauthorized: false }, 
    });

    const resetUrl = `${process.env.RESET_PASSWORD_URL}?token=${resetToken}`;
    console.log("Reset password URL:", resetUrl);

    await transporter.sendMail({
      from: `"Smart Blood Donation" <${process.env.EMAIL_SERVICE}>`,
      to: email,
      subject: "Yêu cầu đặt lại mật khẩu",
      html: `
        <p>Xin chào ${user.full_name || "bạn"},</p>
        <p>Bạn đã yêu cầu đặt lại mật khẩu.</p>
        <p>Nhấp vào liên kết bên dưới để tạo mật khẩu mới (hết hạn sau 1 giờ):</p>
        <a href="${resetUrl}" target="_blank">${resetUrl}</a>
      `,
    });

    res.json({
      status: true,
      message: "Đường dẫn reset mật khẩu đã được gửi đến email của bạn.",
    });
  } catch (error) {
    console.error("Lỗi gửi mail reset:", error);
    res.status(500).json({
      status: false,
      message: "Lỗi hệ thống khi gửi link reset mật khẩu.",
      error: error.message,
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        status: false,
        message: "Thiếu token hoặc mật khẩu mới.",
      });
    }

 
    console.log("Token client gửi:", token);

    const decodedToken = decodeURIComponent(token); // fix trường hợp token bị mã hóa URL
    const hashedToken = crypto.createHash("sha256").update(decodedToken).digest("hex");

    console.log("Token hash để tìm:", hashedToken);

    const user = await User.findOne({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({
        status: false,
        message: "Token không hợp lệ hoặc đã hết hạn.",
      });
    }

   
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({
      status: true,
      message: "Mật khẩu đã được đặt lại thành công!",
    });
  } catch (error) {
    console.error("Lỗi reset mật khẩu:", error);
    res.status(500).json({
      status: false,
      message: "Lỗi hệ thống khi xử lý reset mật khẩu.",
      error: error.message,
    });
  }
};


exports.resetPasswordAuto = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user)
      return res.status(404).json({ status: false, message: "Không tìm thấy người dùng." });

    const newPassword = crypto.randomBytes(5).toString("hex"); // Tạo mật khẩu ngẫu nhiên
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_SERVICE,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: `"Smart Blood Donation" <${process.env.EMAIL_SERVICE}>`,
      to: email,
      subject: "Mật khẩu mới của bạn",
      html: `<p>Mật khẩu mới của bạn là: <b>${newPassword}</b></p>`,
    });

    return res.json({
      status: true,
      message: "Mật khẩu mới đã được gửi đến email của bạn.",
    });
  } catch (error) {
    console.error("Lỗi reset mật khẩu tự động:", error);
    res.status(500).json({
      status: false,
      message: "Không thể tạo mật khẩu mới tự động.",
      error: error.message,
    });
  }
};
