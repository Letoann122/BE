const express = require("express");
const router = express.Router();
const UserController = require("../controllers/UserController");
const CreateTaiKhoanRequest = require("../requests/client/CreateTaiKhoanRequest");
const validateRequest = require("../middlewares/validateRequest");
const { check } = require("express-validator");
const LoginRequest = require("../middlewares/LoginRequest");

//active_account
router.get("/activate/:token", UserController.activate);
//forgot_password
router.post("/forgot-password", UserController.forgotPassword);
router.post("/change-password", UserController.resetPassword);
//dang-ky
router.post(
  "/register",
  CreateTaiKhoanRequest,
  validateRequest,
  UserController.register
);
//dang-nhap
router.post("/login", 
LoginRequest,
validateRequest,
  UserController.login
);
//dang-xuat
router.get("/logout", 
  UserController.logout);

module.exports = router;