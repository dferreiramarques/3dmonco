const express = require('express');
const crypto = require('crypto');
const { pool } = require('../db');
const { normalizeCode, isValidPin } = require('../codes');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

// Aluno entra numa sala: encontra a submissão existente (nome+pin) ou cria uma nova.
router.post('/join', asyncHandler(async (req, res) => {
  const { classroom_code, student_name, student_pin } = req.body || {};
  const code = normalizeCode(classroom_code);
  const name = String(student_name || '').trim();
  const pin = String(student_pin || '').trim();

  if (!code) return res.status(400).json({ error: 'Indica o código da sala.' });
  if (!name) return res.status(400).json({ error: 'Indica o teu nome.' });
  if (!isValidPin(pin)) return res.status(400).json({ error: 'O código pessoal tem de ter 4 números.' });

  const { rows: activityRows } = await pool.query(
    'SELECT id, title, brief FROM activities WHERE classroom_code=$1',
    [code]
  );
  const activity = activityRows[0];
  if (!activity) return res.status(404).json({ error: 'Código de sala não encontrado.' });

  const { rows: existingRows } = await pool.query(
    `SELECT id, shapes_json FROM submissions
     WHERE activity_id=$1 AND lower(student_name)=lower($2) AND student_pin=$3`,
    [activity.id, name, pin]
  );

  let submission = existingRows[0];
  if (!submission) {
    const id = crypto.randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO submissions (id, activity_id, student_name, student_pin)
       VALUES ($1,$2,$3,$4) RETURNING id, shapes_json`,
      [id, activity.id, name, pin]
    );
    submission = rows[0];
  }

  res.json({
    submission_id: submission.id,
    shapes_json: submission.shapes_json,
    activity: { title: activity.title, brief: activity.brief }
  });
}));

// Autosave do aluno — o id da submissão funciona como capability token.
router.put('/:id', asyncHandler(async (req, res) => {
  const { shapes_json } = req.body || {};
  if (!shapes_json || !Array.isArray(shapes_json.shapes)) {
    return res.status(400).json({ error: 'Formato inválido.' });
  }
  const { rowCount } = await pool.query(
    'UPDATE submissions SET shapes_json=$1, updated_at=now() WHERE id=$2',
    [shapes_json, req.params.id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Submissão não encontrada.' });
  res.json({ ok: true });
}));

module.exports = router;
