const express = require("express");
const { register, login, getUsers } = require("../controllers/authController");
const verifyToken = require("../middleware/authMiddleware");

const router = express.Router();

// Роут для реєстрації та логіну
router.post("/register", register);
router.post("/login", login);

// Роут для отримання користувачів, з перевіркою токену
router.get("/users", verifyToken, getUsers);

module.exports = router;
