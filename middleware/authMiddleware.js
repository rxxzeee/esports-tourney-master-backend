// /middleware/verifyToken.js
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config/config");

module.exports = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];  // Отримуємо токен з заголовка
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Перевіряємо токен
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;  // Додаємо інформацію про користувача в запит
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};
