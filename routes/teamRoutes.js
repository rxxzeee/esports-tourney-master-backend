const express = require("express");
const router = express.Router();
const teamController = require("../controllers/teamController");
const verifyToken = require("../middleware/authMiddleware");
const isCaptain = require("../middleware/isCaptain");

// Створення команди
router.post("/", verifyToken, teamController.createTeam);

// Додавання учасника (тільки капітан)
router.post("/:teamId/members", verifyToken, isCaptain, teamController.addMember);

// Самостійне приєднання до команди
router.post("/:teamId/join", verifyToken, teamController.joinTeam);

// Отримання інформації про команду
router.get("/:id", verifyToken, teamController.getTeamDetails);

module.exports = router;