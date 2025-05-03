// server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const tournamentRoutes = require("./routes/tournamentRoutes");
const teamRoutes = require("./routes/teamRoutes"); // Додано імпорт

const app = express();
const port = process.env.PORT || 3000;

// Middleware мають бути першими
app.use(express.json());
app.use(cors({
  origin: "http://localhost:8080",
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: "Content-Type,Authorization"
}));

// Підключення маршрутів
app.use("/auth", authRoutes);
app.use("/tournaments", tournamentRoutes);
app.use("/teams", teamRoutes); // Після ініціалізації app

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});