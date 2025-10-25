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
const ChangePasswordController = require("../controllers/ChangePassController");

const CreateTaiKhoanRequest = require("../requests/client/CreateTaiKhoanRequest");
const validateRequest = require("../middlewares/validateRequest");
const LoginRequest = require("../middlewares/LoginRequest");
const verifyToken = require("../middlewares/verifyToken");

// active-acc
router.get("/activate/:token", ActivateController.activate);

//quen-mk
router.post("/forgot-password", ForgotPasswordController.forgotPassword);

//dat-lai-mk
router.post("/reset-password", ResetPasswordController.resetPassword);

//doi-pass
router.put("/change-password", verifyToken, ChangePasswordController.changePassword);

//register_client
router.post("/register", CreateTaiKhoanRequest, validateRequest, RegisterController.register);

// login
router.post("/login", LoginRequest, validateRequest, LoginController.login);

//logout
router.get("/logout", LogoutController.logout);

// profile
router.get("/profile", verifyToken, ProfileController.getProfile);
router.put("/profile", verifyToken, ProfileController.updateProfile);

module.exports = router;
