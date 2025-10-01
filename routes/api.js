const express = require("express");
const router = express.Router();
const UserController = require("../controllers/UserController");
const CreateTaiKhoanRequest = require("../requests/client/CreateTaiKhoanRequest");
const validateRequest = require("../middlewares/validateRequest");
const { check } = require("express-validator");
const LoginRequest = require("../middlewares/LoginRequest");



router.post(
  "/register",
  CreateTaiKhoanRequest,
  validateRequest,
  UserController.register
);

router.post("/login", 
LoginRequest,
validateRequest,
  UserController.login
);

router.get("/logout", 
  UserController.logout);


router.post("/forgot-password",)


module.exports = router;
