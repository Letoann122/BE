const { body } = require("express-validator");
const { User } = require("../../models");

const CreateTaiKhoanRequest = [
  body("email")
    .notEmpty().withMessage("Bạn chưa nhập email.")
    .isEmail().withMessage("Email không hợp lệ.")
    .custom(async (value) => {
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

  body("password_confirmation")
    .notEmpty().withMessage("Mật khẩu nhập lại chưa nhập.")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Mật khẩu nhập lại không khớp.");
      }
      return true;
    }),

  body("full_name")
    .notEmpty().withMessage("Bạn chưa nhập họ và tên.")
    .isLength({ max: 255 }).withMessage("Họ và tên không được quá 255 ký tự."),

  body("phone")
    .notEmpty().withMessage("Bạn chưa nhập số điện thoại.")
    .isLength({ min: 10, max: 10 }).withMessage("Số điện thoại phải có 10 chữ số."),

  body("birthday")
    .notEmpty().withMessage("Bạn chưa nhập ngày sinh.")
    .isISO8601().withMessage("Ngày sinh không hợp lệ."),

  body("gender")
    .notEmpty().withMessage("Bạn chưa chọn giới tính."),

  body("address")
    .notEmpty().withMessage("Bạn chưa nhập địa chỉ.")
    .isLength({ max: 255 }).withMessage("Địa chỉ không được quá 255 ký tự."),

  body("blood_group")
    .notEmpty().withMessage("Vui lòng chọn nhóm máu."),

  body("role")
    .notEmpty().withMessage("Bạn chưa chọn vai trò."),
];

module.exports = CreateTaiKhoanRequest;
