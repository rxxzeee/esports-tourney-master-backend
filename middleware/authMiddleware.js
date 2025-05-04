const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config/config");

module.exports = (req, res, next) => {
  const authHeader = req.header("Authorization") || "";
  
  // Перевірка наявності Bearer та токену
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized. Invalid token format" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized. Token missing" });
  }

  try {
    // Верифікація токену
    req.user = jwt.verify(token, SECRET_KEY);
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Token expired" });
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Invalid token" });
    }
    res.status(500).json({ error: "Server error during token verification" });
  }
};
