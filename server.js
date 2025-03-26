const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = 3000;

// Налаштування підключення до бази даних PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'sevice_db',
  password: '1234',
  port: 5432,
});

// Маршрут для перевірки підключення до бази даних
app.get('/db', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    res.send(result.rows);
    client.release();
  } catch (err) {
    console.error(err);
    res.send('Error ' + err);
  }
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Сервер запущено на http://localhost:${port}`);
});