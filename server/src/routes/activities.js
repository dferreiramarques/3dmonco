const express = require('express');
const crypto = require('crypto');
const { pool } = require('../db');
const { newClassroomCode, normalizeCode } = require('../codes');
const { requireTeacher } = require('../middleware/auth');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

async function generateUniqueCode() {
  for (let i = 0; i < 10; i++) {
    const code = newClassroomCode();
    const { rows } = await pool.query('SELECT 1 FROM activities WHERE classroom_code=$1', [code]);
    if (!rows.length) return code;
  }
  throw new Error('Não foi possível gerar um código de sala único.');
}

router.post('/', requireTeacher, asyncHandler(async (req, res) => {
  const { title, brief } = req.body || {};
  if (!title || !String(title).trim()) return res.status(400).json({ error: 'Título é obrigatório.' });
  const id = crypto.randomUUID();
  const classroomCode = await generateUniqueCode();
  const { rows } = await pool.query(
    `INSERT INTO activities (id, teacher_id, classroom_code, title, brief)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, classroom_code, title, brief, created_at`,
    [id, req.teacher.teacherId, classroomCode, String(title).trim(), String(brief || '')]
  );
  res.json(rows[0]);
}));

router.get('/', requireTeacher, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT a.id, a.classroom_code, a.title, a.brief, a.created_at,
            COUNT(s.id)::int AS submission_count
     FROM activities a
     LEFT JOIN submissions s ON s.activity_id = a.id
     WHERE a.teacher_id = $1
     GROUP BY a.id
     ORDER BY a.created_at DESC`,
    [req.teacher.teacherId]
  );
  res.json(rows);
}));

router.patch('/:id', requireTeacher, asyncHandler(async (req, res) => {
  const { title, brief } = req.body || {};
  const { rows: owned } = await pool.query(
    'SELECT id FROM activities WHERE id=$1 AND teacher_id=$2',
    [req.params.id, req.teacher.teacherId]
  );
  if (!owned.length) return res.status(404).json({ error: 'Atividade não encontrada.' });

  const { rows } = await pool.query(
    `UPDATE activities SET
       title = COALESCE(NULLIF($1,''), title),
       brief = COALESCE($2, brief)
     WHERE id=$3
     RETURNING id, classroom_code, title, brief, created_at`,
    [title ? String(title).trim() : '', brief != null ? String(brief) : null, req.params.id]
  );
  res.json(rows[0]);
}));

router.delete('/:id', requireTeacher, asyncHandler(async (req, res) => {
  const { rowCount } = await pool.query(
    'DELETE FROM activities WHERE id=$1 AND teacher_id=$2',
    [req.params.id, req.teacher.teacherId]
  );
  if (!rowCount) return res.status(404).json({ error: 'Atividade não encontrada.' });
  res.json({ ok: true });
}));

// Público — usado pelo aluno para ver o brief no botão ⚙️
router.get('/by-code/:code', asyncHandler(async (req, res) => {
  const code = normalizeCode(req.params.code);
  const { rows } = await pool.query(
    'SELECT title, brief FROM activities WHERE classroom_code=$1',
    [code]
  );
  if (!rows.length) return res.status(404).json({ error: 'Código de sala não encontrado.' });
  res.json(rows[0]);
}));

router.get('/:id/submissions', requireTeacher, asyncHandler(async (req, res) => {
  const { rows: owned } = await pool.query(
    'SELECT id FROM activities WHERE id=$1 AND teacher_id=$2',
    [req.params.id, req.teacher.teacherId]
  );
  if (!owned.length) return res.status(404).json({ error: 'Atividade não encontrada.' });

  const { rows } = await pool.query(
    'SELECT id, student_name, updated_at FROM submissions WHERE activity_id=$1 ORDER BY updated_at DESC',
    [req.params.id]
  );
  res.json(rows);
}));

module.exports = router;
