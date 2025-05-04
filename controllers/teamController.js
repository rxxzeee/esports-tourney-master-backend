const pool = require("../config/db");

// Створення команди (тільки для авторизованих користувачів)
exports.createTeam = async (req, res) => {
    const { name, discipline } = req.body;
    const captainId = req.user.userId;
  
    try {
      const user = await pool.query('SELECT is_blocked FROM users WHERE id = $1', [captainId]);
  
      if (user.rows[0].is_blocked) {
        return res.status(403).json({ error: "Blocked users cannot create teams" });
      }
  
      const teamResult = await pool.query(
        `INSERT INTO teams (name, discipline, created_by) 
         VALUES ($1, $2, $3) 
         RETURNING *`, 
        [name, discipline, captainId]
      );
  
      await pool.query(
        `INSERT INTO team_members (team_id, user_id, is_captain) 
         VALUES ($1, $2, TRUE)`, 
        [teamResult.rows[0].id, captainId]
      );
  
      res.status(201).json(teamResult.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  };
  
// Додавання гравця до команди (тільки капітан)
exports.addMember = async (req, res) => {
  const { teamId } = req.params;
  const { userId } = req.body;
  const captainId = req.user.userId;

  try {
    // 1. Перевірка прав капітана
    const isCaptain = await pool.query(
      `SELECT 1 FROM team_members 
       WHERE team_id = $1 AND user_id = $2 AND is_captain = TRUE`,
      [teamId, captainId]
    );
    
    if (!isCaptain.rows.length) {
      return res.status(403).json({ error: "Тільки капітан може додавати учасників" });
    }

    // 2. Перевірка максимальної кількості (5 гравців)
    const membersCount = await pool.query(
      `SELECT COUNT(*) FROM team_members WHERE team_id = $1`,
      [teamId]
    );
    
    if (membersCount.rows[0].count >= 5) {
      return res.status(400).json({ error: "Команда повна (максимум 5 гравців)" });
    }

    // 3. Перевірка чи гравець вже в команді
    const existingMember = await pool.query(
      `SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId]
    );
    
    if (existingMember.rows.length > 0) {
      return res.status(400).json({ error: "Гравець вже є в команді" });
    }

    // 4. Додавання учасника
    await pool.query(
      `INSERT INTO team_members (team_id, user_id)
       VALUES ($1, $2)`,
      [teamId, userId]
    );

    res.json({ message: "Учасник доданий" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка сервера" });
  }
};

// Додаткові методи (опційно)
exports.getTeamDetails = async (req, res) => {
  const { id } = req.params;
  
  try {
    const teamInfo = await pool.query(
      `SELECT * FROM teams WHERE id = $1`,
      [id]
    );
    
    const members = await pool.query(
      `SELECT users.id, users.username 
       FROM team_members
       JOIN users ON team_members.user_id = users.id
       WHERE team_id = $1`,
      [id]
    );

    res.json({
      ...teamInfo.rows[0],
      members: members.rows
    });
  } catch (err) {
    res.status(500).json({ error: "Помилка сервера" });
  }
};

exports.joinTeam = async (req, res) => {
    const { teamId } = req.params;
    const userId = req.user.userId;
  
    try {
      const teamExists = await pool.query("SELECT 1 FROM teams WHERE id = $1", [teamId]);
      if (!teamExists.rows.length) {
        return res.status(404).json({ error: "Team not found" });
      }
  
      const user = await pool.query("SELECT is_blocked FROM users WHERE id = $1", [userId]);
      if (user.rows[0].is_blocked) {
        return res.status(403).json({ error: "Blocked users cannot join teams" });
      }
  
      const existingMembership = await pool.query("SELECT 1 FROM team_members WHERE user_id = $1", [userId]);
      if (existingMembership.rows.length > 0) {
        return res.status(400).json({ error: "You are already in another team" });
      }
  
      const membersCount = await pool.query("SELECT COUNT(*) FROM team_members WHERE team_id = $1", [teamId]);
      if (membersCount.rows[0].count >= 5) {
        return res.status(400).json({ error: "Team is full (max 5 players)" });
      }
  
      await pool.query("INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)", [teamId, userId]);
  
      res.json({ message: "Successfully joined the team" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
  
  // GET /teams/:id/rating
exports.getTeamRating = async (req, res) => {
  const teamId = parseInt(req.params.id, 10);
  const { rows } = await pool.query(
    "SELECT rating, updated_at FROM team_ratings WHERE team_id = $1",
    [teamId]
  );
  if (!rows.length) return res.status(404).json({ error: "Team not found" });
  res.json(rows[0]);
};
