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

const ProfileController        = require("../controllers/ProfileController");
const ChangePasswordController = require("../controllers/ChangePassController");
const NewsController           = require("../controllers/NewsController");
const AcpDoctorController = require("../controllers/admin/AcpDoctorController");

const CreateTaiKhoanRequest = require("../requests/client/CreateTaiKhoanRequest");
const validateRequest = require("../middlewares/validateRequest");
const LoginRequest = require("../middlewares/LoginRequest");
const verifyToken = require("../middlewares/verifyToken");

// Auth routes
router.get("/activate/:token", ActivateController.activate);
router.post("/forgot-password", ForgotPasswordController.forgotPassword);
router.post("/reset-password", ResetPasswordController.resetPassword);
router.put("/change-password", verifyToken, ChangePasswordController.changePassword);
router.post("/register", CreateTaiKhoanRequest, validateRequest, RegisterController.register);
router.post("/login", LoginRequest, validateRequest, LoginController.login);
router.get("/logout", LogoutController.logout);

// Profile routes
router.get("/profile", verifyToken, ProfileController.getProfile);
router.put("/profile", verifyToken, ProfileController.updateProfile);

// ✅ News routes
router.get("/news", NewsController.getAll);
router.get("/news/:id", NewsController.getById);

//Acp doctor
router.get("/doctors/pending", AcpDoctorController.getPending);
router.put("/doctors/:id/approve", AcpDoctorController.approve);
router.put("/doctors/:id/reject", AcpDoctorController.reject);
router.post("/doctors/search", AcpDoctorController.searchDoctor);



module.exports = router;
