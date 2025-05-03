// routes/tournamentRoutes.js
const express = require("express");
const {
  createTournament,
  updateTournament,
  deleteTournament,
  getTournaments // Додано новий метод
} = require("../controllers/tournamentController");

const verifyToken = require("../middleware/authMiddleware");
const isOrganizer = require("../middleware/isOrganizer");

const router = express.Router();

// Додано публічний доступ до списку турнірів
router.get("/", getTournaments);
router.post("/", verifyToken, createTournament);
router.put("/:id", verifyToken, isOrganizer, updateTournament);
router.delete("/:id", verifyToken, isOrganizer, deleteTournament);

module.exports = router;