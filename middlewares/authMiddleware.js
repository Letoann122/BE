// middlewares/verifyToken.js (giữ nguyên của bạn)
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

module.exports = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader)
    return res.status(401).json({ status: false, message: "Thiếu token xác thực!" });

  const token = authHeader.split(" ")[1];
  if (!token)
    return res.status(401).json({ status: false, message: "Token không hợp lệ!" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // id, full_name, email, role ... từ lúc sign
    next();
  } catch (error) {
    return res.status(403).json({
      status: false,
      message: "Token hết hạn hoặc không hợp lệ!",
      error: error.message,
    });
  }
};
