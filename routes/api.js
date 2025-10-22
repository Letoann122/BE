// routes/api.js
const express = require("express");
const router = express.Router();

const {
  RegisterController,
  ActivateController,
  LoginController,
  LogoutController,
  ForgotPasswordController,
  ResetPasswordController,
} = require("../controllers");

const ProfileController = require("../controllers/ProfileController");
const CreateTaiKhoanRequest = require("../requests/client/CreateTaiKhoanRequest");
const validateRequest = require("../middlewares/validateRequest");
const LoginRequest = require("../middlewares/LoginRequest");
const verifyToken = require("../middlewares/verifyToken");

// Kích hoạt tài khoản
router.get("/activate/:token", ActivateController.activate);

// Quên mật khẩu
router.post("/forgot-password", ForgotPasswordController.forgotPassword);

// Đổi mật khẩu
router.post("/change-password", ResetPasswordController.resetPassword);

// Đăng ký
router.post("/register", CreateTaiKhoanRequest, validateRequest, RegisterController.register);

// Đăng nhập
router.post("/login", LoginRequest, validateRequest, LoginController.login);

// Đăng xuất
router.get("/logout", LogoutController.logout);

// Profile
router.get("/profile", verifyToken, ProfileController.getProfile);
router.put("/profile", verifyToken, ProfileController.updateProfile);

module.exports = router;
