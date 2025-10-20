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

const CreateTaiKhoanRequest = require("../requests/client/CreateTaiKhoanRequest");
const validateRequest = require("../middlewares/validateRequest");
const LoginRequest = require("../middlewares/LoginRequest");
//kich-hoat
router.get("/activate/:token", ActivateController.activate);
//quen-pass
router.post("/forgot-password", ForgotPasswordController.forgotPassword);
//doi-pass
router.post("/change-password", ResetPasswordController.resetPassword);
//dang-ky
router.post(
  "/register",
  CreateTaiKhoanRequest,
  validateRequest,
  RegisterController.register
);
//dang-nhap
router.post(
  "/login",
  LoginRequest,
  validateRequest,
  LoginController.login
);
//dang-xuat
router.get("/logout", LogoutController.logout);

module.exports = router;
