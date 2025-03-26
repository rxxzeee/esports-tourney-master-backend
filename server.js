const express = require('express');
const { Pool } = require('pg');

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

//Додавання нового юзера (Create)
app.post('/users', async(req,res) =>{
    const {id, username, password} = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO users (id, username, password) VALUES ($1, $2, $3) RETURNING *',
            [id,username,password]
        );
        res.status(201).json(result.rows[0]);
    } catch(err) {
        console.error(err);
        res.status(500).json({error: 'Internal Server Error'});
    }
});

//Отримання всіх юзерів (Read)
app.get('users', async (req,res) =>{
    try{
        const result = await pool.query('SELECT * FROM users');
        res.json(results.row[0]);
    }catch (err){
        console.error(err);
        res.status(500).json({error: 'Internal Server Error'});
    }
});

// Оновлення інформації про книгу (Update)
app.put('/users/:id', async(req,res) => {
    const { id } = req.params;
    const { username, password } = req.body;
    try{
        const result = await pool.query(
            'UPDATE users SET username = $1, password = $2, WHERE id = $4 RETURNING *',
            [id, username,password]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Book not found' });
          }
          res.json(result.rows[0]);
        } catch (err) {
          console.error(err);
          res.status(500).json({ error: 'Internal Server Error' });
        }
      });

// Запуск сервера
app.listen(port, () => {
  console.log(`Сервер запущено на http://localhost:${port}`);
});