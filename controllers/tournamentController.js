    // controllers/tournamentController.js
    const pool = require("../config/db");

    // Додано: Отримання турнірів з фільтрацією
    exports.getTournaments = async (req, res) => {
    const { status } = req.query;
    try {
        let query = 'SELECT * FROM tournaments';
        const params = [];
        
        if (status) {   
        query += ' WHERE status = $1';
        params.push(status);
        }
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
    };

    // Оновлено: Додано статус при створенні
    exports.createTournament = async (req, res) => {
    const { name, format, rules, description, start_date, end_date, max_teams, status } = req.body;
    const userId = req.user.userId;

    try {
        const result = await pool.query(
        `INSERT INTO tournaments 
            (name, format, rules, description, start_date, end_date, max_teams, created_by, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [name, format, rules, description, start_date, end_date, max_teams, userId, status || 'запланований']
        );
        res.status(201).json({ 
        message: "Tournament created", 
        tournament: result.rows[0] 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
    };

    // Оновлено: Додано валідацію статусу
    exports.updateTournament = async (req, res) => {
    const { id } = req.params;
    const { name, format, rules, description, start_date, end_date, max_teams, status } = req.body;
    
    // Валідація статусу
    const allowedStatuses = ['запланований', 'активний', 'завершений'];
    if (status && !allowedStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid tournament status" });
    }

    try {
        const result = await pool.query(
        `UPDATE tournaments
            SET name = $1, 
                format = $2, 
                rules = $3, 
                description = $4,
                start_date = $5, 
                end_date = $6, 
                max_teams = $7, 
                status = $8
        WHERE id = $9
        RETURNING *`,
        [name, format, rules, description, start_date, end_date, max_teams, status, id]
        );
        
        if (!result.rows.length) {
        return res.status(404).json({ error: "Tournament not found" });
        }
        
        res.json({ 
        message: "Tournament updated",
        tournament: result.rows[0] 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
    };

    // Видалення залишається без змін
    exports.deleteTournament = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
        "DELETE FROM tournaments WHERE id = $1 RETURNING id",
        [id]
        );
        if (!result.rows.length) return res.status(404).json({ error: "Tournament not found" });
        res.json({ message: "Tournament deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
    };