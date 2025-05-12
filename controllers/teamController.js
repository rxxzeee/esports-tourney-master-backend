const pool = require("../config/db");

// Створення команди
exports.createTeam = async (req, res) => {
    const { name, discipline } = req.body;
    const captainId = req.user.userId;
  
    try {
        // Перевірка чи заблокований користувач
        const user = await pool.query('SELECT is_blocked FROM users WHERE id = $1', [captainId]);
        if (user.rows[0].is_blocked) {
            return res.status(403).json({ error: "Заблоковані користувачі не можуть створювати команди" });
        }

        // Валідація даних
        if (!name || name.length < 3 || name.length > 50) {
            return res.status(400).json({ error: "Назва команди повинна містити від 3 до 50 символів" });
        }

        const validDisciplines = ['Футбол', 'Баскетбол', 'Волейбол', 'Кіберспорт'];
        if (!validDisciplines.includes(discipline)) {
            return res.status(400).json({ error: "Невірна дисципліна" });
        }

        // Створення команди
        const teamResult = await pool.query(
            `INSERT INTO teams (name, discipline, created_by) 
             VALUES ($1, $2, $3) 
             RETURNING *`, 
            [name, discipline, captainId]
        );

        // Додавання капітана
        await pool.query(
            `INSERT INTO team_members (team_id, user_id, is_captain) 
             VALUES ($1, $2, TRUE)`, 
            [teamResult.rows[0].id, captainId]
        );

        res.status(201).json(teamResult.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Помилка сервера" });
    }
};

// Додавання гравця до команди
exports.addMember = async (req, res) => {
    const { teamId } = req.params;
    const { userId } = req.body;
    const captainId = req.user.userId;

    try {
        // Перевірка прав капітана
        const isCaptain = await pool.query(
            `SELECT 1 FROM team_members 
             WHERE team_id = $1 AND user_id = $2 AND is_captain = TRUE`,
            [teamId, captainId]
        );
        
        if (!isCaptain.rows.length) {
            return res.status(403).json({ error: "Тільки капітан може додавати учасників" });
        }

        // Перевірка максимальної кількості (5 гравців)
        const membersCount = await pool.query(
            `SELECT COUNT(*) FROM team_members WHERE team_id = $1`,
            [teamId]
        );
        
        if (membersCount.rows[0].count >= 5) {
            return res.status(400).json({ error: "Команда вже заповнена (максимум 5 гравців)" });
        }

        // Перевірка чи гравець вже в команді
        const existingMember = await pool.query(
            `SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2`,
            [teamId, userId]
        );
        
        if (existingMember.rows.length > 0) {
            return res.status(400).json({ error: "Гравець вже є в цій команді" });
        }

        // Додавання учасника
        await pool.query(
            `INSERT INTO team_members (team_id, user_id)
             VALUES ($1, $2)`,
            [teamId, userId]
        );

        res.json({ message: "Учасника успішно додано" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Помилка сервера" });
    }
};

// Отримання інформації про команду
exports.getTeamDetails = async (req, res) => {
    const { id } = req.params;
    
    try {
        const teamInfo = await pool.query(
            `SELECT * FROM teams WHERE id = $1`,
            [id]
        );
        
        if (!teamInfo.rows.length) {
            return res.status(404).json({ error: "Команду не знайдено" });
        }
        
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
        console.error(err);
        res.status(500).json({ error: "Помилка сервера" });
    }
};

// Приєднання до команди
exports.joinTeam = async (req, res) => {
    const { teamId } = req.params;
    const userId = req.user.userId;
  
    try {
        const teamExists = await pool.query("SELECT 1 FROM teams WHERE id = $1", [teamId]);
        if (!teamExists.rows.length) {
            return res.status(404).json({ error: "Команду не знайдено" });
        }
  
        const user = await pool.query("SELECT is_blocked FROM users WHERE id = $1", [userId]);
        if (user.rows[0].is_blocked) {
            return res.status(403).json({ error: "Заблоковані користувачі не можуть приєднуватися до команд" });
        }
  
        const existingMembership = await pool.query("SELECT 1 FROM team_members WHERE user_id = $1", [userId]);
        if (existingMembership.rows.length > 0) {
            return res.status(400).json({ error: "Ви вже перебуваєте в іншій команді" });
        }
  
        const membersCount = await pool.query("SELECT COUNT(*) FROM team_members WHERE team_id = $1", [teamId]);
        if (membersCount.rows[0].count >= 5) {
            return res.status(400).json({ error: "Команда вже заповнена (максимум 5 гравців)" });
        }
  
        await pool.query("INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)", [teamId, userId]);
  
        res.json({ message: "Ви успішно приєдналися до команди" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Помилка сервера" });
    }
};
  
// Отримання рейтингу команди
exports.getTeamRating = async (req, res) => {
    const teamId = parseInt(req.params.id, 10);
    
    try {
        const { rows } = await pool.query(
            "SELECT rating, updated_at FROM team_ratings WHERE team_id = $1",
            [teamId]
        );
        
        if (!rows.length) {
            return res.status(404).json({ error: "Команду не знайдено" });
        }
        
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Помилка сервера" });
    }
};

// Отримання профілю команди
exports.getTeamProfile = async (req, res) => {
    const teamId = parseInt(req.params.id, 10);

    try {
        // Основна інформація про команду
        const teamQ = await pool.query(
            `SELECT name, discipline
             FROM teams
             WHERE id = $1`,
            [teamId]
        );
        
        if (!teamQ.rows.length) {
            return res.status(404).json({ error: 'Команду не знайдено' });
        }
        
        const { name: teamName, discipline } = teamQ.rows[0];

        // Статистика перемог/поразок
        const winsQ = await pool.query(
            `SELECT COUNT(*) AS wins
             FROM matches
             WHERE winner_id = $1`,
            [teamId]
        );
        
        const playedQ = await pool.query(
            `SELECT COUNT(*) AS played
             FROM matches
             WHERE team1_id = $1 OR team2_id = $1`,
            [teamId]
        );
        
        const wins = +winsQ.rows[0].wins;
        const played = +playedQ.rows[0].played;
        const losses = played - wins;
        const winRate = played ? Math.round((wins/played)*100) : 0;

        // Рейтинг команди
        const ratingQ = await pool.query(
            `SELECT rating
             FROM team_ratings
             WHERE team_id = $1
             ORDER BY updated_at DESC
             LIMIT 1`,
            [teamId]
        );
        
        const rating = ratingQ.rows.length ? +ratingQ.rows[0].rating : null;

        // Склад команди
        const membersQ = await pool.query(
            `SELECT u.id, u.username, tm.is_captain, tm.position
             FROM team_members tm
             JOIN users u ON tm.user_id = u.id
             WHERE tm.team_id = $1
             ORDER BY tm.is_captain DESC, u.username`,
            [teamId]
        );
        
        const members = membersQ.rows.map(m => ({
            id: m.id,
            name: m.username,
            role: m.is_captain ? 'Капітан' : m.position || 'Гравець',
            initial: m.username.charAt(0).toUpperCase()
        }));

        res.json({
            teamId,
            teamName,
            discipline,
            rating,
            wins,
            losses,
            winRate,
            members
        });

    } catch (err) {
        console.error('Помилка отримання профілю команди:', err);
        res.status(500).json({ error: 'Помилка сервера' });
    }
};

// Отримання всіх команд
exports.getAllTeams = async (req, res) => {
  try {
    // Отримуємо основну інформацію про всі команди
    const teams = await pool.query(`
      SELECT id, name, discipline 
      FROM teams
      ORDER BY name
    `);

    // Для кожної команди отримуємо детальну інформацію
    const teamsWithDetails = await Promise.all(
      teams.rows.map(async (team) => {
        const teamId = team.id;

        // Статистика матчів
        const [wins, matches] = await Promise.all([
          pool.query(`SELECT COUNT(*) FROM matches WHERE winner_id = $1`, [teamId]),
          pool.query(`SELECT COUNT(*) FROM matches WHERE team1_id = $1 OR team2_id = $1`, [teamId])
        ]);

        const winsCount = parseInt(wins.rows[0].count);
        const matchesCount = parseInt(matches.rows[0].count);
        const lossesCount = matchesCount - winsCount;
        const winRate = matchesCount > 0 ? Math.round((winsCount / matchesCount) * 100) : 0;

        // Рейтинг
        const ratingResult = await pool.query(
          `SELECT rating FROM team_ratings 
           WHERE team_id = $1 ORDER BY updated_at DESC LIMIT 1`,
          [teamId]
        );
        const rating = ratingResult.rows[0]?.rating || 1000;

        // Учасники команди
        const membersResult = await pool.query(
          `SELECT u.id, u.username, tm.is_captain, tm.position
           FROM team_members tm
           JOIN users u ON tm.user_id = u.id
           WHERE tm.team_id = $1
           ORDER BY tm.is_captain DESC, u.username`,
          [teamId]
        );

        const members = membersResult.rows.map(member => ({
          id: member.id,
          name: member.username,
          role: member.is_captain ? 'Капітан' : member.position || 'Гравець',
          initial: member.username.charAt(0).toUpperCase()
        }));

        return {
          teamId: team.id,
          teamName: team.name,
          discipline: team.discipline,
          rating: rating,
          wins: winsCount,
          losses: lossesCount,
          winRate: winRate,
          members: members
        };
      })
    );

    res.json(teamsWithDetails);

  } catch (err) {
    console.error('Помилка отримання списку команд:', err);
    res.status(500).json({ 
      error: 'Внутрішня помилка сервера' 
    });
  }
};
