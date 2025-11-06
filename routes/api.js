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
const ProfileController        = require("../controllers/ProfileController");
const ChangePasswordController = require("../controllers/ChangePassController");
const NewsController           = require("../controllers/NewsController");

const AdminController          = require("../controllers/admin/AdminController");
const AcpDoctorController      = require("../controllers/admin/AcpDoctorController");
const DoctorController         = require("../controllers/doctor/DoctorController");
const DonorController          = require("../controllers/donor/DonorController");

//middleware
const verifyToken         = require("../middlewares/verifyToken");
const validateRequest      = require("../middlewares/validateRequest");
const LoginRequest         = require("../middlewares/LoginRequest");
const CreateTaiKhoanRequest = require("../requests/client/CreateTaiKhoanRequest");

// Auth
router.post("/register", CreateTaiKhoanRequest, validateRequest, RegisterController.register);
router.post("/login", LoginRequest, validateRequest, LoginController.login);
router.get("/logout", LogoutController.logout);

router.get("/activate/:token", ActivateController.activate);
router.post("/forgot-password", ForgotPasswordController.forgotPassword);
router.post("/reset-password", ResetPasswordController.resetPassword);

router.get("/news", NewsController.getAll);
router.get("/news/:id", NewsController.getById);

//donor
const donorRouter = express.Router();
donorRouter.get("/check-token", DonorController.checkToken);

//profile donor
donorRouter.get("/profile", ProfileController.getProfile);
donorRouter.put("/profile", ProfileController.updateProfile);
// Change password
donorRouter.put("/change-password", ChangePasswordController.changePassword);

router.use("/donor", verifyToken("donor"), donorRouter);

//doctor
const doctorRouter = express.Router();
doctorRouter.get("/check-token", DoctorController.checkToken);
doctorRouter.get("/blood-inventory", verifyToken("doctor"), BloodInventoryController.getAll);
doctorRouter.post("/blood-inventory", verifyToken("doctor"), BloodInventoryController.create);
doctorRouter.post("/blood-inventory/filter", verifyToken("doctor"), BloodInventoryController.filter);
doctorRouter.put("/blood-inventory/:id", verifyToken("doctor"), BloodInventoryController.update);
doctorRouter.delete("/blood-inventory/:id", verifyToken("doctor"), BloodInventoryController.delete);

router.use("/doctor", verifyToken("doctor"), doctorRouter);

//admin
const adminRouter = express.Router();
adminRouter.get("/check-token", AdminController.checkToken);

//acp-bacsi
adminRouter.get("/doctors/pending", AcpDoctorController.getPending);
adminRouter.put("/doctors/:id/approve", AcpDoctorController.approve);
adminRouter.put("/doctors/:id/reject", AcpDoctorController.reject);
adminRouter.post("/doctors/search", AcpDoctorController.searchDoctor);

router.use("/admin", verifyToken("admin"), adminRouter);

module.exports = router;
