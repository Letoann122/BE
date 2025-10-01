const express = require("express");
const router = express.Router();
const UserController = require("../controllers/UserController");
const CreateTaiKhoanRequest = require("../requests/client/CreateTaiKhoanRequest");
const validateRequest = require("../middlewares/validateRequest");
const { check } = require("express-validator");
const LoginRequest = require("../middlewares/LoginRequest");

<<<<<<< HEAD
// console.log("DEBUG LoginRequest:", LoginRequest);

const ResetPasswordController = require("../controllers/ResetPassword");
const nodemailer = require("nodemailer");

// console.log("GIÁ TRỊ CỦA CreateTaiKhoanRequest:", CreateTaiKhoanRequest);
// console.log("GIÁ TRỊ CỦA validateRequest:", validateRequest);
// console.log("GIÁ TRỊ CỦA UserController.register:", UserController.register);


=======
//active_account
router.get("/activate/:token", UserController.activate);
//dang-ky
>>>>>>> 977b29c1d04158247c0e181bf15243268e08de76
router.post(
  "/register",
  ...CreateTaiKhoanRequest,
  validateRequest,
  UserController.register
);
//dang-nhap
router.post("/login", 
...LoginRequest,
validateRequest,
  UserController.login
);
//dang-xuat
router.get("/logout", 
  UserController.logout);

<<<<<<< HEAD

router.post("/ResetPassword" , ResetPasswordController.hash_reset);
// router.post("/forgot-password", ResetPasswordController.hash_reset);

router.post("/forgot-password", UserController.forgotPassword);

router.post("/reset-password", UserController.resetPassword);




=======
>>>>>>> 977b29c1d04158247c0e181bf15243268e08de76
module.exports = router;
