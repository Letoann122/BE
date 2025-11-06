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

const BloodInventoryController = require("../controllers/doctor/BloodInventoryController");
const ProfileController = require("../controllers/ProfileController");
const ChangePasswordController = require("../controllers/ChangePassController");
const NewsController = require("../controllers/NewsController");

const AdminController = require("../controllers/admin/AdminController");
const AcpDoctorController = require("../controllers/admin/AcpDoctorController");
const DoctorController = require("../controllers/doctor/DoctorController");
const DonorController = require("../controllers/donor/DonorController");
const AdminController = require("../controllers/admin/AdminController");
const campaignsController = require("../controllers/admin/campaignsController");
const DashboardController = require("../controllers/admin/DashboardController");

// middleware
const verifyToken = require("../middlewares/verifyToken");
const validateRequest = require("../middlewares/validateRequest");
const LoginRequest = require("../middlewares/LoginRequest");
const CreateTaiKhoanRequest = require("../requests/client/CreateTaiKhoanRequest");

// ======================================================
// =============== AUTHENTICATION ROUTES ================
// ======================================================
router.post(
  "/register",
  CreateTaiKhoanRequest,
  validateRequest,
  RegisterController.register
);
router.post("/login", LoginRequest, validateRequest, LoginController.login);
router.get("/logout", LogoutController.logout);

router.get("/activate/:token", ActivateController.activate);
router.post("/forgot-password", ForgotPasswordController.forgotPassword);
router.post("/reset-password", ResetPasswordController.resetPassword);

// ======================================================
// ===================== NEWS ROUTES ====================
// ======================================================
router.get("/news", NewsController.getAll);
router.get("/news/:id", NewsController.getById);

// ======================================================
// ===================== DONOR ROUTES ===================
// ======================================================
const donorRouter = express.Router();

donorRouter.get("/check-token", DonorController.checkToken);
donorRouter.get("/profile", ProfileController.getProfile);
donorRouter.put("/profile", ProfileController.updateProfile);
donorRouter.put("/change-password", ChangePasswordController.changePassword);

router.use("/donor", verifyToken("donor"), donorRouter);

// ======================================================
// ===================== DOCTOR ROUTES ==================
// ======================================================
const doctorRouter = express.Router();

doctorRouter.get("/check-token", DoctorController.checkToken);
doctorRouter.get(
  "/blood-inventory",
  verifyToken("doctor"),
  BloodInventoryController.getAll
);
doctorRouter.post(
  "/blood-inventory",
  verifyToken("doctor"),
  BloodInventoryController.create
);
doctorRouter.post(
  "/blood-inventory/filter",
  verifyToken("doctor"),
  BloodInventoryController.filter
);
doctorRouter.put(
  "/blood-inventory/:id",
  verifyToken("doctor"),
  BloodInventoryController.update
);
doctorRouter.delete(
  "/blood-inventory/:id",
  verifyToken("doctor"),
  BloodInventoryController.delete
);

router.use("/doctor", verifyToken("doctor"), doctorRouter);

// ======================================================
// ===================== ADMIN ROUTES ===================
// ======================================================
const adminRouter = express.Router();

// Check-token admin
adminRouter.get(
  "/check-token",
  verifyToken("admin"),
  AdminController.checkToken
);

// Quản lý user
adminRouter.get(
  "/users",
  verifyToken("admin"),
  AdminDonorController.getAllUsers
);
adminRouter.put(
  "/users/:id",
  verifyToken("admin"),
  AdminDonorController.editUser
);
adminRouter.delete(
  "/users/:id",
  verifyToken("admin"),
  AdminDonorController.removeUser
);

// Chiến dịch hiến máu
adminRouter.post(
  "/Campaigns",
  verifyToken("admin"),
  campaignsController.createCampaign
);
router.get("/Campaigns", campaignsController.getAllCampaigns); // public cho user xem

// Dashboard
adminRouter.get(
  "/dashboard",
  verifyToken("admin"),
  dashboardController.getStats
);

// ACP bác sĩ
adminRouter.get(
  "/doctors/pending",
  verifyToken("admin"),
  AcpDoctorController.getPending
);
adminRouter.put(
  "/doctors/:id/approve",
  verifyToken("admin"),
  AcpDoctorController.approve
);
adminRouter.put(
  "/doctors/:id/reject",
  verifyToken("admin"),
  AcpDoctorController.reject
);
adminRouter.post(
  "/doctors/search",
  verifyToken("admin"),
  AcpDoctorController.searchDoctor
);

// Mount admin router
router.use("/admin", verifyToken("admin"), adminRouter);

module.exports = router;
