const express = require("express");
const router = express.Router();
const teamController = require("../controllers/teamController");
const verifyToken = require("../middleware/authMiddleware");
const isCaptain = require("../middleware/isCaptain");
const { check } = require('express-validator');

// Створення команди
router.post("/", 
    verifyToken,
    [
        check('name').isLength({ min: 3, max: 50 }).withMessage('Назва команди повинна містити від 3 до 50 символів'),
        check('discipline').isIn(['Футбол', 'Баскетбол', 'Волейбол', 'Кіберспорт']).withMessage('Невірна дисципліна')
    ],
    teamController.createTeam
);

// Додавання учасника (тільки для капітана)
router.post("/:teamId/members", 
    verifyToken, 
    isCaptain, 
    teamController.addMember
);

// Приєднання до команди
router.post("/:teamId/join", 
    verifyToken, 
    teamController.joinTeam
);

// Інформація про команду
router.get("/:id", 
    verifyToken, 
    teamController.getTeamDetails
);

// Рейтинг команди
router.get("/:id/rating", 
    verifyToken, 
    teamController.getTeamRating
);

// Профіль команди
router.get("/:id/profile", 
    verifyToken, 
    teamController.getTeamProfile
);

// Список всіх команд
router.get("/", 
    teamController.getAllTeams
);

module.exports = router;