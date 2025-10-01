const express = require("express");
const router = express.Router();
const UserController = require("../controllers/UserController");
const CreateTaiKhoanRequest = require("../requests/client/CreateTaiKhoanRequest");
const validateRequest = require("../middlewares/validateRequest");
const { check } = require("express-validator");
const LoginRequest = require("../middlewares/LoginRequest");

// console.log("DEBUG LoginRequest:", LoginRequest);

const ResetPasswordController = require("../controllers/ResetPassword");
const nodemailer = require("nodemailer");

// console.log("GIÁ TRỊ CỦA CreateTaiKhoanRequest:", CreateTaiKhoanRequest);
// console.log("GIÁ TRỊ CỦA validateRequest:", validateRequest);
// console.log("GIÁ TRỊ CỦA UserController.register:", UserController.register);


router.post(
  "/register",
  ...CreateTaiKhoanRequest,
  validateRequest,
  UserController.register
);

router.post("/login", 
...LoginRequest,
validateRequest,
  UserController.login
);

router.get("/logout", 
  UserController.logout);


router.post("/ResetPassword" , ResetPasswordController.hash_reset);
// router.post("/forgot-password", ResetPasswordController.hash_reset);

router.post("/forgot-password", UserController.forgotPassword);

router.post("/reset-password", UserController.resetPassword);




module.exports = router;
