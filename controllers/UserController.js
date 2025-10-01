const { User } = require("../models");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
<<<<<<< HEAD
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const {Op} = require("sequelize");

const db = require("../models");
=======
const { v4: UUIDv4 } = require("uuid");
const transporter = require("../config/mailer");

>>>>>>> 977b29c1d04158247c0e181bf15243268e08de76
dotenv.config();

const UserController = {
  async register(req, res) {
    try {
      const {
        full_name,
        birthday,
        gender,
        phone,
        email,
        address,
        blood_group,
        role,
        medical_history,
        password,
      } = req.body;

      // Kiểm tra email tồn tại
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.json({
          status: false,
          message: "Email đã được sử dụng!",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      //hash_active
      const activeToken = UUIDv4();

      // Tạo user mới
      const user = await User.create({
        full_name,
        birthday,
        gender,
        phone,
        email,
        address,
        blood_group,
        role,
        medical_history,
        password: hashedPassword,
        tinh_trang: 0,
        hash_active: activeToken,
      });

      const activateLink = `${process.env.APP_URL}/activate/${activeToken}`;

      await transporter.sendMail({
         from: `"Smart Blood Donation" <${process.env.MAIL_USER}>`,
        to: email,
        subject: "Kích hoạt tài khoản của bạn",
        html: 
        `<h2>Xin chào ${full_name},</h2>
          <p>Cảm ơn bạn đã đăng ký tài khoản tại Smart Blood Donation.</p>
          <p>Vui lòng nhấn vào link dưới đây để kích hoạt tài khoản của bạn:</p>
          <a href="${activateLink}" target="_blank">${activateLink}</a>
          <br/><br/>
          <p>Nếu bạn không đăng ký, vui lòng bỏ qua email này.</p>`
      });

      return res.json({
        status: true,
        message: "Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt",
        data: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          // hash_active: user.hash_active,
        },
      });
    } catch (err) {
      console.error("❌ Register error:", err);
      return res.status(500).json({
        status: false,
        message: "Đăng ký thất bại!",
        error: err.message
      });
    }
  },
  //active_account
  async activate(req, res){
    try {
      const { token} = req.params;
      const user = await User.findOne({where: {hash_active: token}});
      if (!user) {
        return res.status(400).json({
          status  : false,
          message : "Token kích hoạt không hợp lệ",
        });
      }
      user.tinh_trang = 1;
      user.hash_active = null;
      await user.save();

      return res.redirect(`${process.env.FRONTEND_URL}/dang-nhap`);
    } catch (error){
      return res.data(500).json({
        status: false,
        message: "Kích hoạt thất bại",
        error: error.message,
      });
    }
  },
  //dang-nhap
  async login(req, res) {
    const error = validationResult(req);
    if (!error.isEmpty()) {
      return res.status(422).json({
        status: false,
        errors: error.array().map((err) => err.msg),
      });
    }

    const { email, password } = req.body;
    try {
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(400).json({
          status: false,
          message: "Email hoặc mật khẩu không đúng!",
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({
          status: false,
          message: "Email hoặc mật khẩu không đúng!",
        });
      }

      const payload = {
        id: user.id,
        full_name: user.full_name,
        role: user.role,
      };

      const token = jwt.sign(payload, process.env.jwt_secret, {
        expiresIn: "7d",
      });

      res.cookie("token", token, { httpOnly: true });
      return res.json({
        status: true,
        message: "Đăng nhập thành công!",
        data: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          token,
        },
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "Đăng nhập thất bại!",
        error: error.message,
      });
    }
  },

  //dang-xuat
  async logout(req, res) {
    try {
      // Xoá cookie token
      res.clearCookie("token", { httpOnly: true });

      return res.json({
        status: true,
        message: "Đăng xuất thành công!",
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "Đăng xuất thất bại!",
        error: error.message,
      });
    }
  }
<<<<<<< HEAD
},

  


   async logout(req, res) {
  try {
    // Xoá cookie token
    res.clearCookie("token", { httpOnly: true });

    return res.json({
      status: true,
      message: "Đăng xuất thành công!",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Đăng xuất thất bại!",
      error: error.message,
    });
  }
},


async forgotPassword(req, res) {

    const { email } = req.body;
    
    try {
      // 1. Tìm kiếm User bằng email
      const user = await User.findOne({ where: { email } });

      if (!user) {
        // Trả về thành công giả để tránh leak thông tin user nào tồn tại
        return res.json({
          status: true,
          message: "Nếu email tồn tại, link reset mật khẩu đã được gửi.",
        });
      }

      // 2. Tạo Reset Token
      
      const resetToken = crypto.randomBytes(32).toString("hex");
      // Hash token để lưu vào database (vì lý do bảo mật)
      const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
      const resetTokenExpiry = Date.now() + 3600000; // Hết hạn sau 1 giờ

      // 3. Lưu Token vào Database
      user.resetPasswordToken = resetTokenHash;
      user.resetPasswordExpires = resetTokenExpiry;
      await user.save();

      // 4. Cấu hình và Gửi Email
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // true cho port 465, false cho các port khác
        auth: {
          user: process.env.EMAIL_SERVICE,
          pass: process.env.EMAIL_PASSWORD, // Mật khẩu ứng dụng của Gmail
        },
      });

      const resetUrl = `${process.env.URL_SERVER}/reset-password?token=${resetToken}`;
      
      await transporter.sendMail({
        from: '"Hệ thống Hỗ trợ" <support@yourdomain.com>',
        to: email,
        subject: "Yêu cầu Đặt lại Mật khẩu",
        html: `
          <p>Xin chào ${user.full_name},</p>
          <p>Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng nhấp vào liên kết dưới đây để hoàn tất:</p>
          <p><a href="${resetUrl}"><b>ĐẶT LẠI MẬT KHẨU CỦA TÔI</b></a></p>
          <p>Liên kết này sẽ hết hạn sau 1 giờ. Nếu bạn không yêu cầu thay đổi mật khẩu, vui lòng bỏ qua email này.</p>
        `,
      });

      // 5. Phản hồi thành công
      return res.json({
        status: true,
        message: "Link đặt lại mật khẩu đã được gửi đến email của bạn.",
      });
      
    } catch (error) {
      console.error("Lỗi Quên Mật Khẩu:", error);
      return res.status(500).json({
        status: false,
        message: "Lỗi hệ thống khi xử lý yêu cầu quên mật khẩu.",
        error: error.message,
      });
    }
  },
  

  // ... (Tiếp tục trong object ResetPasswordController)

async resetPassword(req, res) {
    const { token, newPassword } = req.body;
=======
>>>>>>> 977b29c1d04158247c0e181bf15243268e08de76

    // 1. Hash token nhận được từ request (req.body)
   
    const resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");

    try {
        // 2. Tìm User bằng token đã hash VÀ kiểm tra token còn hạn (chưa hết giờ)
        const user = await User.findOne({ 
            where: { 
                resetPasswordToken: resetTokenHash,
                resetPasswordExpires: {
                    [Op.gt]: Date.now() // So sánh lớn hơn thời gian hiện tại
                }
            } 
        });

        if (!user) {
            // Token không hợp lệ hoặc đã hết hạn
            return res.status(400).json({
                status: false,
                message: "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.",
            });
        }

        // 3. Hash mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 4. Cập nhật mật khẩu và xóa token/thời hạn khỏi DB
        user.password = hashedPassword;
        user.resetPasswordToken = null; // Xóa token
        user.resetPasswordExpires = null; // Xóa thời hạn
        await user.save();

        // 5. Phản hồi thành công
        return res.json({
            status: true,
            message: "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.",
        });

    } catch (error) {
        console.error("Lỗi đặt lại mật khẩu:", error);
        return res.status(500).json({
            status: false,
            message: "Lỗi hệ thống khi đặt lại mật khẩu.",
            error: error.message,
        });
    }
},


  async logout(req, res) {
    try {
      // Xoá cookie token
      res.clearCookie("token", { httpOnly: true });

      return res.json({
        status: true,
        message: "Đăng xuất thành công!",
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "Đăng xuất thất bại!",
        error: error.message,
      });
    }
  },
};

module.exports = UserController;
