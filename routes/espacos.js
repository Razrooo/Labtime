const router = require("express").Router();
const pool = require("../db");

router.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM espacos ORDER BY nome ASC");
        res.json(result.rows);
    } catch (err) {
        res.status(500).send("Erro ao buscar espaços.");
    }
});

module.exports = router;
