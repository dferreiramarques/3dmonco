const express = require('express');
const { pool } = require('../db');
const { requireTeacher } = require('../middleware/auth');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

async function loadOwnedSubmission(submissionId, teacherId) {
  const { rows } = await pool.query(
    `SELECT s.* FROM submissions s
     JOIN activities a ON a.id = s.activity_id
     WHERE s.id=$1 AND a.teacher_id=$2`,
    [submissionId, teacherId]
  );
  return rows[0];
}

router.get('/:id', requireTeacher, asyncHandler(async (req, res) => {
  const submission = await loadOwnedSubmission(req.params.id, req.teacher.teacherId);
  if (!submission) return res.status(404).json({ error: 'Trabalho não encontrado.' });
  res.json({
    student_name: submission.student_name,
    shapes_json: submission.shapes_json,
    updated_at: submission.updated_at
  });
}));

// "Abrir no Monco" — professor edita e guarda por cima do trabalho do aluno.
router.put('/:id', requireTeacher, asyncHandler(async (req, res) => {
  const { shapes_json } = req.body || {};
  if (!shapes_json || !Array.isArray(shapes_json.shapes)) {
    return res.status(400).json({ error: 'Formato inválido.' });
  }
  const submission = await loadOwnedSubmission(req.params.id, req.teacher.teacherId);
  if (!submission) return res.status(404).json({ error: 'Trabalho não encontrado.' });

  await pool.query(
    'UPDATE submissions SET shapes_json=$1, updated_at=now() WHERE id=$2',
    [shapes_json, req.params.id]
  );
  res.json({ ok: true });
}));

module.exports = router;
