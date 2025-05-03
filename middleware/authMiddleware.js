const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config/config");

module.exports = (req, res, next) => {
  const authHeader = req.header("Authorization") || "";
  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    req.user = jwt.verify(token, SECRET_KEY);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};
