const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

// Налаштування підключення до бази даних PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'service_db',
  password: '1234',
  port: 5432,
});

app.use(express.json());

const SECRET_KEY = 'your-secret-key'; // Заміни на свій секретний ключ

// Функція для генерації JWT токена
const generateToken = (userId) => {
  return jwt.sign({ userId }, SECRET_KEY, { expiresIn: '1h' });
};

// Додавання нового користувача (Create)
app.post('/users', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10); // Хешуємо пароль
    const result = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *',
      [username, hashedPassword]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Вхід користувача (Login) і генерування JWT
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Перевірка пароля
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Генерація JWT токена
    const token = generateToken(user.id);
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Мідлвар для перевірки JWT
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1]; // Очікуємо, що токен буде переданий у заголовку Authorization

  if (!token) {
    return res.status(403).json({ error: 'Access denied' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Отримання всіх користувачів (Read) - доступно тільки для авторизованих
app.get('/users', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Оновлення інформації про користувача (Update) - доступно тільки для авторизованих
app.put('/users/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { username, password } = req.body;

  if (req.user.userId !== parseInt(id)) {
    return res.status(403).json({ error: 'You can only update your own information' });
  }

  try {
    const result = await pool.query(
      'UPDATE users SET username = $1, password = $2 WHERE id = $3 RETURNING *',
      [username, password, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Видалення користувача по ID - доступно тільки для авторизованих
app.delete('/users/:id', authenticateToken, async (req, res) => {
  const userId = req.params.id;

  if (req.user.userId !== parseInt(userId)) {
    return res.status(403).json({ error: 'You can only delete your own account' });
  }

  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully', deletedUser: result.rows[0] });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Сервер запущено на http://localhost:${port}`);
});
