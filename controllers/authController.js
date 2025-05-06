const pool       = require("../config/db");
const jwt        = require("jsonwebtoken");
// const bcrypt     = require("bcrypt");
const crypto     = require("crypto");
const { SECRET_KEY } = require("../config/config");

exports.register = async (req, res) => {
  const { username, password } = req.body;
  const role = 1; // player

  try {
    const { rows } = await pool.query(
      "SELECT 1 FROM users WHERE username = $1", 
      [username]
    );
    if (rows.length) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, password, role_id) 
       VALUES ($1, $2, $3) 
       RETURNING id, username, role_id`, 
      [username, hashedPassword, role]
    );
    res.status(201).json({ message: "User registered", user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 2) Логін — перевірка пароля і генерація токена
exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    // 1) Знаходимо користувача
    const result = await pool.query(
      "SELECT id, username, password, role_id FROM users WHERE username = $1",
      [username]
    );
    if (!result.rows.length) {
      return res.status(401).json({ error: "Невірні облікові дані" });
    }
    const user = result.rows[0];

    // 2) Перевіряємо пароль
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Невірні облікові дані" });
    }

    const userId = user.id;
    const role   = user.role_id;

    // 3) Генеруємо accessToken
    const accessToken = jwt.sign(
      { userId, username: user.username, role },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    // 4) Генеруємо refreshToken
    const refreshToken = crypto.randomBytes(64).toString("hex");
    const expiresAt    = new Date(Date.now() + 7 * 24*60*60*1000); // на 7 днів

    // 5) Зберігаємо refreshToken у БД
    await pool.query(
      `INSERT INTO refresh_tokens(token, user_id, expires_at)
       VALUES ($1, $2, $3)`,
      [refreshToken, userId, expiresAt]
    );

    // 6) Повертаємо обидва токени
    res.json({
      message: "Успішний вхід",
      accessToken,
      refreshToken
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Внутрішня помилка сервера" });
  }
};

// 3) Повернення всіх користувачів
exports.getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, role_id FROM users"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 4) Редагування профілю
exports.updateProfile = async (req, res) => {
  const { description, avatar_url } = req.body;
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      "UPDATE users SET description = $1, avatar_url = $2 WHERE id = $3 RETURNING id, username, description, avatar_url, role_id",
      [description, avatar_url, userId]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "Profile updated", user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 5) Блокування користувача
exports.blockUser = async (req, res) => {
  const userIdToBlock = parseInt(req.params.id, 10);
  try {
    const result = await pool.query(
      "UPDATE users SET is_blocked = TRUE WHERE id = $1 RETURNING id, username, is_blocked",
      [userIdToBlock]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User blocked", user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 6) Видалення користувача
exports.deleteUser = async (req, res) => {
  const userIdToDelete = parseInt(req.params.id, 10);
  try {
    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING id",
      [userIdToDelete]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 7) Профіль користувача
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query(
      "SELECT id, username, role_id, is_blocked FROM users WHERE id = $1",
      [userId]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Контролер для оновлення accessToken
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token не передано" });
  }

  // 1) Знаходимо токен у БД
  const { rows } = await pool.query(
    "SELECT user_id, expires_at FROM refresh_tokens WHERE token = $1",
    [refreshToken]
  );
  if (!rows.length) {
    return res.status(403).json({ error: "Невірний refresh token" });
  }

  const { user_id, expires_at } = rows[0];
  if (new Date() > expires_at) {
    // очищаємо прострочений токен
    await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [refreshToken]);
    return res.status(403).json({ error: "Refresh token протерміновано" });
  }

  // 2) Формуємо новий accessToken
  const { rows: u } = await pool.query(
    "SELECT username, role_id FROM users WHERE id = $1",
    [user_id]
  );
  const payload = {
    userId:   user_id,
    username: u[0].username,
    role:     u[0].role_id
  };
  const newAccessToken = jwt.sign(payload, SECRET_KEY, { expiresIn: "1h" });

  res.json({ accessToken: newAccessToken });
};