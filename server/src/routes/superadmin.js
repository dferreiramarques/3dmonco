const express = require('express');
const { pool } = require('../db');
const { requireSuperadmin } = require('../middleware/auth');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

// Todas as atividades de todos os professores — sem identidade do professor.
router.get('/activities', requireSuperadmin, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT a.id, a.classroom_code, a.title, a.created_at,
           COUNT(s.id)::int AS submission_count
    FROM activities a
    LEFT JOIN submissions s ON s.activity_id = a.id
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `);
  res.json(rows);
}));

// Brief + resultados anonimizados de uma atividade.
router.get('/activities/:id', requireSuperadmin, asyncHandler(async (req, res) => {
  const { rows: activityRows } = await pool.query(
    'SELECT id, classroom_code, title, brief, created_at FROM activities WHERE id=$1',
    [req.params.id]
  );
  const activity = activityRows[0];
  if (!activity) return res.status(404).json({ error: 'Atividade não encontrada.' });

  const { rows: submissions } = await pool.query(
    'SELECT id, updated_at FROM submissions WHERE activity_id=$1 ORDER BY updated_at ASC',
    [req.params.id]
  );
  res.json({
    classroom_code: activity.classroom_code,
    title: activity.title,
    brief: activity.brief,
    created_at: activity.created_at,
    submissions: submissions.map((s, i) => ({ id: s.id, label: `Resultado ${i + 1}`, updated_at: s.updated_at }))
  });
}));

// Ver um resultado, sem nome de aluno.
router.get('/submissions/:id', requireSuperadmin, asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT shapes_json FROM submissions WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Resultado não encontrado.' });
  res.json({ shapes_json: rows[0].shapes_json });
}));

module.exports = router;
