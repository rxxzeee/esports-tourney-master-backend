const express = require("express");
const {
  register,
  login,
  getUsers,
  updateProfile,
  blockUser,
  deleteUser,
  getProfile
} = require("../controllers/authController");

const verifyToken = require("../middleware/authMiddleware");
const isAdmin     = require("../middleware/isAdmin");

const router = express.Router();

// Публічні маршрути
router.post("/register", register);
router.post("/login",    login);

// Захищені маршрути
router.get("/users",      verifyToken, getUsers);
router.put("/profile",    verifyToken, updateProfile);
router.get("/profile",    verifyToken, getProfile);

// Адмінські маршрути
router.patch("/users/:id/block", verifyToken, isAdmin, blockUser);
router.delete("/users/:id",      verifyToken, isAdmin, deleteUser);

module.exports = router;
