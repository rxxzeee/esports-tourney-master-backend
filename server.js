// server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config(); // Завантаження змінних оточення з .env файлу

// Імпорт маршрутів
const authRoutes = require("./routes/authRoutes");
const tournamentRoutes = require("./routes/tournamentRoutes");
const teamRoutes = require("./routes/teamRoutes");
const matchRoutes = require("./routes/matchRoutes");
const dailyTaskRoutes = require("./routes/dailyTaskRoutes");

const app = express();
const port = process.env.PORT || 3000;

// Middleware мають бути першими
app.use(express.json()); // Парсинг JSON-тіла запиту
app.use(cors({
  origin: "http://localhost:8080", // Дозволити лише цей домен
  methods: "GET,POST,PUT,DELETE", // Дозволені методи
  allowedHeaders: "Content-Type,Authorization" // Дозволені заголовки
}));

// Логування запитів (для налагодження)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`); // Логуємо метод та URL кожного запиту
  next();
});

// Підключення маршрутів
app.use("/auth", authRoutes); // Маршрути для автентифікації
app.use("/tournaments", tournamentRoutes); // Маршрути для турнірів
app.use("/teams", teamRoutes); // Маршрути для команд
app.use("/matches", matchRoutes); // Маршрути для матчів
app.use("/daily-tasks", dailyTaskRoutes); // Маршрути для щоденних завдань

// Обробка помилок (якщо жоден з маршрутів не відповість)
app.use((err, req, res, next) => {
  console.error(err.stack); // Логуємо стек помилки
  res.status(500).json({ error: "Щось пішло не так!" }); // Відповідь клієнту
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
