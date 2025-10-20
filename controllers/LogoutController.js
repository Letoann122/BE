// LogoutController.js
module.exports = {
  async logout(req, res) {
    try {
      res.clearCookie("token", { httpOnly: true });
      return res.json({ status: true, message: "Đăng xuất thành công!" });
    } catch (error) {
      return res.status(500).json({ status: false, message: "Đăng xuất thất bại!", error: error.message });
    }
  },
};
