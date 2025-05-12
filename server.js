const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Імпорт маршрутів
const authRoutes = require("./routes/authRoutes");
const tournamentRoutes = require("./routes/tournamentRoutes");
const teamRoutes = require("./routes/teamRoutes");
const matchRoutes = require("./routes/matchRoutes");
const dailyTaskRoutes = require("./routes/dailyTaskRoutes");

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(cors({
    origin: "http://localhost:3000",
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization"
}));

// Логування запитів
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Підключення маршрутів
app.use("/auth", authRoutes);
app.use("/tournaments", tournamentRoutes);
app.use("/teams", teamRoutes);
app.use("/matches", matchRoutes);
app.use("/daily-tasks", dailyTaskRoutes);

// Обробка помилок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Внутрішня помилка сервера" });
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущено на http://localhost:${port}`);
});