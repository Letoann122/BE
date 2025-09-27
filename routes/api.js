const express = require("express");
const router = express.Router();
const UserController = require("../controllers/UserController");
const CreateTaiKhoanBenhNhanRequest = require("../requests/CreateTaiKhoanBenhNhanRequest");
const validateRequest = require("../middlewares/validateRequest");

router.post(
  "/benh-nhan/register",
  CreateTaiKhoanBenhNhanRequest,
  validateRequest,
  UserController.register
);

module.exports = router;
