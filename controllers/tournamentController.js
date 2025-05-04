const pool = require("../config/db");

// Отримати список турнірів
exports.getTournaments = async (req, res) => {
  const { status } = req.query;
  try {
    let query = "SELECT * FROM tournaments";
    const params = [];
    if (status) {
      query += " WHERE status = $1";
      params.push(status);
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Створити турнір
exports.createTournament = async (req, res) => {
  const {
    name, format, rules, description,
    start_date, end_date, max_teams, status
  } = req.body;
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      `INSERT INTO tournaments
         (name, format, rules, description, start_date, end_date, max_teams, created_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [name, format, rules, description, start_date, end_date, max_teams, userId, status || "запланований"]
    );
    res.status(201).json({ message: "Tournament created", tournament: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Оновити турнір
exports.updateTournament = async (req, res) => {
  const { id } = req.params;
  const {
    name, format, rules, description,
    start_date, end_date, max_teams, status
  } = req.body;
  const userId = req.user.userId;

  const allowed = ["запланований", "активний", "завершений"];
  if (status && !allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid tournament status" });
  }

  try {
    // Перевірка чи користувач є організатором цього турніру або має роль адміністратора
    const { rows } = await pool.query("SELECT created_by, status FROM tournaments WHERE id = $1", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    // Перевірка доступу
    if (rows[0].created_by !== userId && req.user.role !== 2) {
      return res.status(403).json({ error: "You do not have permission to update this tournament" });
    }

    const result = await pool.query(
      `UPDATE tournaments
         SET name=$1, format=$2, rules=$3, description=$4,
             start_date=$5, end_date=$6, max_teams=$7, status=$8
       WHERE id=$9
       RETURNING *`,
      [name, format, rules, description, start_date, end_date, max_teams, status, id]
    );

    res.json({ message: "Tournament updated", tournament: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Видалити турнір
exports.deleteTournament = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    // Перевірка чи користувач є організатором цього турніру або має роль адміністратора
    const { rows } = await pool.query("SELECT created_by FROM tournaments WHERE id = $1", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    // Перевірка доступу
    if (rows[0].created_by !== userId && req.user.role !== 2) {
      return res.status(403).json({ error: "You do not have permission to delete this tournament" });
    }

    const result = await pool.query("DELETE FROM tournaments WHERE id = $1 RETURNING id", [id]);
    res.json({ message: "Tournament deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Генерація стартового раунду
exports.generateFirstRound = async (req, res) => {
  const tournamentId = parseInt(req.params.id, 10);
  if (isNaN(tournamentId)) {
    return res.status(400).json({ error: "Невірний ID турніру" });
  }

  try {
    // Перевірка чи користувач є організатором цього турніру або має роль адміністратора
    const { rows } = await pool.query("SELECT created_by FROM tournaments WHERE id = $1", [tournamentId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    if (rows[0].created_by !== req.user.userId && req.user.role !== 2) {
      return res.status(403).json({ error: "You do not have permission to generate the first round" });
    }

    await pool.query("SELECT generate_matches($1)", [tournamentId]);
    res.json({ message: "Перший раунд згенеровано" });
  } catch (err) {
    console.error("generateFirstRound error:", err);
    res.status(500).json({ error: "Помилка при генерації першого раунду" });
  }
};

// Генерація наступного раунду
exports.generateNextRound = async (req, res) => {
  const tournamentId = parseInt(req.params.id, 10);
  if (isNaN(tournamentId)) {
    return res.status(400).json({ error: "Невірний ID турніру" });
  }

  try {
    // Перевірка чи користувач є організатором цього турніру або має роль адміністратора
    const { rows } = await pool.query("SELECT created_by FROM tournaments WHERE id = $1", [tournamentId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    if (rows[0].created_by !== req.user.userId && req.user.role !== 2) {
      return res.status(403).json({ error: "You do not have permission to generate the next round" });
    }

    await pool.query("SELECT generate_next_round($1)", [tournamentId]);
    res.json({ message: "Наступний раунд згенеровано" });
  } catch (err) {
    console.error("generateNextRound error:", err);
    res.status(500).json({ error: "Помилка при генерації наступного раунду" });
  }
};
