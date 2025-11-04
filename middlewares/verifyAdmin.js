module.exports = (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(400).json({
      status: false,
      message: "Invalid user data",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      status: false,
      message: "bạn không có quyền truy cập vào chức năng này.",
    });
  }
  next();
};
