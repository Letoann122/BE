const jwt = require("jsonwebtoken");
require("dotenv").config();

/**
 * Middleware kiểm tra token & xác thực role (nếu có)
 * @param {string|null} roleRequired - "admin" | "doctor" | "donor" hoặc null
 */
module.exports = (roleRequired = null) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ status: false, message: "Thiếu token xác thực!" });

    const token = authHeader.split(" ")[1];
    if (!token)
      return res.status(401).json({ status: false, message: "Token không hợp lệ!" });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // chứa userId, role, email, full_name

      if (roleRequired && decoded.role !== roleRequired) {
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
