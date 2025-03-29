// /app.js або /server.js
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");  // Імпортуємо маршрути

require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Налаштування CORS (можна змінити залежно від вашої конфігурації)
app.use(cors({
  origin: "http://localhost:8080",  // Фронтенд-адреса
  methods: "GET, POST, PUT, DELETE",
  allowedHeaders: "Content-Type, Authorization"
}));

// Використання маршрутів
app.use("/auth", authRoutes);

app.listen(port, () => {
  console.log(`Сервер запущено на http://localhost:${port}`);
});
