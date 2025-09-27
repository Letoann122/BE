const express = require("express");
const router = express.Router();
const UserController = require("../controllers/UserController");
const CreateTaiKhoanRequest = require("../requests/client/CreateTaiKhoanRequest");
const validateRequest = require("../middlewares/validateRequest");

router.post(
  "/register",
  CreateTaiKhoanRequest,
  validateRequest,
  UserController.register
);

module.exports = router;
