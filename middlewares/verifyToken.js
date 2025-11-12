const jwt = require("jsonwebtoken");
require("dotenv").config();

module.exports = (roleRequired = null) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ status: false, message: "Thiếu token xác thực!" });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ status: false, message: "Token không hợp lệ!" });
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = {
        id: decoded.id || decoded.userId,
        userId: decoded.userId || decoded.id,
        email: decoded.email,
        full_name: decoded.full_name,
        role: decoded.role,
      };
      if (roleRequired && req.user.role !== roleRequired) {
        return res.status(403).json({
          status: false,
          message: "Bạn không có quyền truy cập vào tài nguyên này!",
        });
      }
      next();
    } catch (error) {
      return res.status(403).json({
        status: false,
        message: "Token hết hạn hoặc không hợp lệ!",
        error: error.message,
      });
    }
  };
};
