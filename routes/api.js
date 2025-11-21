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

const LoadProfileController = require("../controllers/donor/LoadProfileController");
const InventoryController = require("../controllers/doctor/InventoryController");

const BloodInventoryController = require("../controllers/doctor/BloodInventoryController");
const DoctorProfileController = require("../controllers/doctor/DoctorProfileController");
const ProfileController = require("../controllers/ProfileController");
const ChangePasswordController = require("../controllers/ChangePassController");
const NewsController = require("../controllers/NewsController");
const DonationSitesController = require("../controllers/donor/DonationSitesController");
const AppointmentController = require("../controllers/donor/AppointmentController");

const AdminController = require("../controllers/admin/AdminController");
const AcpDoctorController = require("../controllers/admin/AcpDoctorController");
const DoctorController = require("../controllers/doctor/DoctorController");
const DonorController = require("../controllers/donor/DonorController");
const AdminDonorController = require("../controllers/admin/AdminDonorController");
const CampaignsController = require("../controllers/admin/CampaignsController");
const DashboardController = require("../controllers/admin/DashboardController");
const ChangePassDoctorController = require("../controllers/doctor/ChangePassController");
const DonationAppointmentController = require("../controllers/doctor/DonationAppointmentController");
const DonationController = require("../controllers/doctor/DonationController");

const verifyToken = require("../middlewares/verifyToken");
const validateRequest = require("../middlewares/validateRequest");
const LoginRequest = require("../middlewares/LoginRequest");
const CreateTaiKhoanRequest = require("../requests/client/CreateTaiKhoanRequest");
const BookingDonationRequest = require("../requests/client/BookingDonationRequest");
const InventoryAdminController = require("../controllers/admin/InventoryAdminController");
const AppointmentAdminController = require("../controllers/admin/AppointmentAdminController");
const DonorManagementController = require("../controllers/doctor/DonorManagementController");
const DonorDetailController = require("../controllers/doctor/DonorDetailController");

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

router.get("/news", NewsController.getAll);
router.get("/news/:id", NewsController.getById);

// donor routes
const donorRouter = express.Router();

donorRouter.get("/check-token", DonorController.checkToken);
donorRouter.get("/profile", ProfileController.getProfile);
donorRouter.put("/profile", ProfileController.updateProfile);
donorRouter.put("/change-password", ChangePasswordController.changePassword);
donorRouter.get("/me", LoadProfileController.me);
donorRouter.get("/donation-sites", DonationSitesController.getAll);
donorRouter.post(
  "/donation-appointments",
  BookingDonationRequest,
  AppointmentController.create
);
donorRouter.get("/donation-appointments", AppointmentController.myList);
donorRouter.post(
  "/donation-appointments/:id/cancel",
  AppointmentController.cancel
);

router.use("/donor", verifyToken("donor"), donorRouter);

const doctorRouter = express.Router();

doctorRouter.get("/check-token", DoctorController.checkToken);
doctorRouter.get("/profile", DoctorProfileController.getProfile);
doctorRouter.put("/profile", DoctorProfileController.updateProfile);
doctorRouter.put("/change-password", ChangePassDoctorController.changePassword);
doctorRouter.get("/inventory/current", InventoryController.current);
doctorRouter.get("/donation-appointments",DonationAppointmentController.index);

doctorRouter.post("/donation-appointments/approve",DonationAppointmentController.approve);

doctorRouter.post("/donation-appointments/reject",DonationAppointmentController.reject);

doctorRouter.get("/blood-inventory", BloodInventoryController.getAll);
doctorRouter.post("/blood-inventory", BloodInventoryController.create);
doctorRouter.post("/blood-inventory/filter", BloodInventoryController.filter);
doctorRouter.put("/blood-inventory/:id", BloodInventoryController.update);
doctorRouter.delete("/blood-inventory/:id", BloodInventoryController.delete);
doctorRouter.get("/donation-appointments/approved",DonationController.index);
doctorRouter.post("/donations/complete",DonationController.completeDonation);
doctorRouter.get("/donors", DonorManagementController.list);
doctorRouter.post("/donors/create", DonorManagementController.create);
doctorRouter.get("/donors/:id", DonorDetailController.detail);

router.use("/doctor", verifyToken("doctor"), doctorRouter);

const adminRouter = express.Router();

adminRouter.get("/check-token", AdminController.checkToken);

// Quản lý user
adminRouter.get("/users", AdminDonorController.getAllUsers);
adminRouter.put("/users/:id", AdminDonorController.editUser);
adminRouter.delete("/users/:id", AdminDonorController.removeUser);

// Chiến dịch hiến máu
adminRouter.post("/Campaigns", CampaignsController.createCampaign);
adminRouter.get("/Campaigns", CampaignsController.getAllCampaigns);
// Dashboard
adminRouter.get("/dashboard", DashboardController.getDashboardStats);

// ACP bác sĩ
adminRouter.get("/doctors/pending", AcpDoctorController.getPending);
adminRouter.put("/doctors/:id/approve", AcpDoctorController.approve);
adminRouter.put("/doctors/:id/reject", AcpDoctorController.reject);
adminRouter.post("/doctors/search", AcpDoctorController.searchDoctor);

// Quản lý kho máu
adminRouter.get("/inventory", InventoryAdminController.getAllInventory);

// Quản lý lịch hẹn
adminRouter.get("/appointments", AppointmentAdminController.getAllAppointments);
adminRouter.put("/appointments/:id/approve", AppointmentAdminController.approveAppointment);
adminRouter.put("/appointments/:id/reject", AppointmentAdminController.rejectAppointment);
// adminRouter.get("/inventory", InventoryController.getAllInventory);



// Quản lý Feedback
// adminRouter.get("/feedback", FeedbackController.getAllFeedback);
// adminRouter.put("/feedback/:id/read", FeedbackController.markAsRead);
// adminRouter.delete("/feedback/:id", FeedbackController.deleteFeedback);

// Bọc middleware verifyToken cho toàn bộ /admin
router.use("/admin", verifyToken("admin"), adminRouter);

module.exports = router;
