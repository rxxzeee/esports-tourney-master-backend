const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
const port = 3000;
const SECRET_KEY = "your_secret_key"; // Змінюй для безпеки!

// Підключення до PostgreSQL
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "service_db",
  password: "1234",
  port: 5432,
});

app.use(express.json());
app.use(cors()); // Дозволяє запити з фронтенду

// ✅ Реєстрація нового користувача
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    // Перевіряємо, чи користувач вже існує
    const userExists = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // Хешуємо пароль
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Створюємо нового користувача в БД
    const result = await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *",
      [username, hashedPassword]
    );
    
    res.status(201).json({ message: "User registered", user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Логін користувача
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    // Шукаємо користувача в БД
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = result.rows[0];

    // Перевіряємо пароль
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Генеруємо JWT токен
    const token = jwt.sign({ userId: user.id, username: user.username }, SECRET_KEY, { expiresIn: "1h" });

    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Отримання всіх користувачів (для тесту)
app.get("/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, username, password FROM users"); // Не передаємо паролі!
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Сервер запущено на http://localhost:${port}`);
});
