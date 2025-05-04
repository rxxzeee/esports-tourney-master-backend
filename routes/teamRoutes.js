const express = require("express");
const router = express.Router();
const teamController = require("../controllers/teamController");
const verifyToken = require("../middleware/authMiddleware");
const isCaptain = require("../middleware/isCaptain");

// Створення команди
// Дозволяється лише авторизованим користувачам
router.post("/", verifyToken, teamController.createTeam);

// Додавання учасника в команду (тільки для капітана команди)
// Перевірка через middleware `isCaptain`, щоб лише капітан міг додавати учасників
router.post("/:teamId/members", verifyToken, isCaptain, teamController.addMember);

// Самостійне приєднання до команди
// Перевірка через middleware `verifyToken`, щоб користувач був авторизований
router.post("/:teamId/join", verifyToken, teamController.joinTeam);

// Отримання інформації про команду
router.get("/:id", verifyToken, teamController.getTeamDetails);

// Отримання рейтингу команди
router.get("/:id/rating", verifyToken, teamController.getTeamRating);

module.exports = router;
