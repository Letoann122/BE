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

const AdminDonnorController = require("../controllers/Admin/AdminDonorController");

const ProfileController = require("../controllers/ProfileController");
const ChangePasswordController = require("../controllers/ChangePassController");
const NewsController = require("../controllers/NewsController");

const CreateTaiKhoanRequest = require("../requests/client/CreateTaiKhoanRequest");
const validateRequest = require("../middlewares/validateRequest");
const LoginRequest = require("../middlewares/LoginRequest");
const verifyToken = require("../middlewares/verifyToken");
const verifyAdmin = require("../middlewares/verifyAdmin");

// Auth routes
router.get("/activate/:token", ActivateController.activate);
router.post("/forgot-password", ForgotPasswordController.forgotPassword);
router.post("/reset-password", ResetPasswordController.resetPassword);
router.put(
  "/change-password",
  verifyToken,
  ChangePasswordController.changePassword
);
router.post(
  "/register",
  CreateTaiKhoanRequest,
  validateRequest,
  RegisterController.register
);
router.post("/login", LoginRequest, validateRequest, LoginController.login);
router.get("/logout", LogoutController.logout);

//adnmin routes
router.get(
  "/admin/users",
  [verifyToken, verifyAdmin],
  AdminDonnorController.getAllUsers
);
router.put(
  "/admin/users/:id",
  [verifyToken, verifyAdmin],
  AdminDonnorController.editUser
);
router.delete(
  "/admin/users/:id",
  [verifyToken, verifyAdmin],
  AdminDonnorController.removeUser
);
// router.get("/admin/donors", AdminDonnorController.getAllDonors);
// router.put("/admin/donors/:id", AdminDonnorController.editDonor);
// router.delete("/admin/donors/:id", AdminDonnorController.removeDonor);

// Profile routes
router.get("/profile", verifyToken, ProfileController.getProfile);
router.put("/profile", verifyToken, ProfileController.updateProfile);

// ✅ News routes
router.get("/news", NewsController.getAll);
router.get("/news/:id", NewsController.getById);

module.exports = router;
