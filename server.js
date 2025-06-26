const express = require("express");
const cors = require("cors");
require("dotenv").config();

const session = require("express-session");
const passport = require("passport");
const SteamStrategy = require("passport-steam").Strategy;
const { Pool } = require("pg");

// Імпорт маршрутів
const authRoutes = require("./routes/authRoutes");
const tournamentRoutes = require("./routes/tournamentRoutes");
const teamRoutes = require("./routes/teamRoutes");
const matchRoutes = require("./routes/matchRoutes");
const dailyTaskRoutes = require("./routes/dailyTaskRoutes");

const app = express();
const port = process.env.PORT || 8080;

// PostgreSQL pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Passport session setup
app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

// Passport Steam strategy
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(new SteamStrategy({
    returnURL: process.env.STEAM_RETURN_URL,
    realm: process.env.STEAM_REALM,
    apiKey: process.env.STEAM_API_KEY
  },
  async function(identifier, profile, done) {
    const steamId = profile.id;
    const username = profile.displayName;
    try {
      // Перевіряємо, чи є користувач у базі
      const { rows } = await pool.query(
        "SELECT * FROM users WHERE steam_id = $1",
        [steamId]
      );
      let user;
      if (rows.length) {
        user = rows[0];
      } else {
        // Створюємо нового користувача з роллю "гравець"
        let usernameToUse = username;
        let exists = await pool.query("SELECT 1 FROM users WHERE username = $1", [usernameToUse]);
        let counter = 1;
        while (exists.rows.length) {
          usernameToUse = `${username}_${counter}`;
          exists = await pool.query("SELECT 1 FROM users WHERE username = $1", [usernameToUse]);
          counter++;
        }
        const result = await pool.query(
          "INSERT INTO users (username, steam_id, role_id) VALUES ($1, $2, $3) RETURNING *",
          [usernameToUse, steamId, 1]
        );
        user = result.rows[0];
      }
      return done(null, user);
    } catch (err) {
      console.error('SteamStrategy error:', err);
      return done(err);
    }
  }
));

// Middleware
app.use(express.json());
app.use(cors({
    origin: "http://localhost:8080",
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

// Steam auth routes
app.get('/auth/steam',
  passport.authenticate('steam', { failureRedirect: '/' })
);

app.get('/auth/steam/return',
  passport.authenticate('steam', { failureRedirect: '/' }),
  async function(req, res) {
    const jwt = require("jsonwebtoken");
    const crypto = require("crypto");

    // 1. Генеруємо accessToken
    const accessToken = jwt.sign(
      { userId: req.user.id, username: req.user.username, role: req.user.role_id },
      process.env.SECRET_KEY,
      { expiresIn: "1h" }
    );

    // 2. Генеруємо refreshToken
    const refreshToken = crypto.randomBytes(64).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 днів

    // 3. Зберігаємо refreshToken у БД
    await pool.query(
      `INSERT INTO refresh_tokens(token, user_id, expires_at) VALUES ($1, $2, $3)`,
      [refreshToken, req.user.id, expiresAt]
    );

    // 4. Редіректимо на фронтенд з усіма потрібними параметрами
    const username = encodeURIComponent(req.user.username);
    const role = encodeURIComponent(req.user.role_id);
    // Додаємо і token, і accessToken (однакові значення)
    res.redirect(
      `http://localhost:8080/steam-callback?token=${accessToken}&accessToken=${accessToken}&refreshToken=${refreshToken}&username=${username}&role=${role}`
    );
  }
);

// Приклад для звичайного логіну/реєстрації (додайте у відповідний роут):
// res.json({
//   token: accessToken,
//   accessToken,
//   refreshToken,
//   role: user.role_id,
//   username: user.username
// });

// Обробка помилок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Внутрішня помилка сервера" });
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Сервер запущено на http://localhost:${port}`);
});