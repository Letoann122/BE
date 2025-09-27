const { body } = require("express-validator");

const CreateTaiKhoanBenhNhanRequest = [
  body("email")
    .notEmpty().withMessage("Bạn chưa nhập email.")
    .isEmail().withMessage("Email không hợp lệ.")
    .custom(async (value, { req }) => {
      const { User } = require("../models");
      const existing = await User.findOne({ where: { email: value } });
      if (existing) {
        throw new Error("Email đã được sử dụng.");
      }
      return true;
    }),

  body("password")
    .notEmpty().withMessage("Bạn chưa nhập mật khẩu.")
    .isLength({ min: 6 }).withMessage("Mật khẩu phải có ít nhất 6 ký tự.")
    .isLength({ max: 50 }).withMessage("Mật khẩu không được quá 50 ký tự."),

  body("re_password")
    .notEmpty().withMessage("Mật khẩu nhập lại chưa nhập")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Mật khẩu nhập lại không khớp");
      }
      return true;
    }),

  body("ho_ten")
    .notEmpty().withMessage("Bạn chưa nhập họ và tên.")
    .isLength({ max: 255 }).withMessage("Họ và tên không được quá 255 ký tự."),

  body("so_dien_thoai")
    .notEmpty().withMessage("Bạn chưa nhập số điện thoại.")
    .isLength({ min: 10, max: 10 }).withMessage("Số điện thoại phải có 10 chữ số."),

  body("ngay_sinh")
    .notEmpty().withMessage("Bạn chưa nhập ngày sinh.")
    .isISO8601().withMessage("Ngày sinh không hợp lệ."),

  body("gioi_tinh")
    .notEmpty().withMessage("Bạn chưa chọn giới tính.")
    .isBoolean().withMessage("Giới tính không hợp lệ."),

  body("dia_chi")
    .notEmpty().withMessage("Bạn chưa nhập địa chỉ.")
    .isLength({ max: 255 }).withMessage("Địa chỉ không được quá 255 ký tự."),
];

module.exports = CreateTaiKhoanBenhNhanRequest;
