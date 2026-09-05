const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../db');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}

function signToken(teacher) {
  return jwt.sign(
    { teacherId: teacher.id, isSuperadmin: teacher.is_superadmin, email: teacher.email },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

router.post('/register', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Email inválido.' });
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: 'A password tem de ter pelo menos 6 caracteres.' });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await pool.query('SELECT id FROM teachers WHERE email=$1', [normalizedEmail]);
  if (existing.rows.length) return res.status(409).json({ error: 'Já existe uma conta com este email.' });

  const passwordHash = await bcrypt.hash(String(password), 10);
  const id = crypto.randomUUID();
  const { rows } = await pool.query(
    'INSERT INTO teachers (id, email, password_hash) VALUES ($1,$2,$3) RETURNING id, email, is_superadmin',
    [id, normalizedEmail, passwordHash]
  );
  res.json({ token: signToken(rows[0]) });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const { rows } = await pool.query('SELECT * FROM teachers WHERE email=$1', [normalizedEmail]);
  const teacher = rows[0];
  if (!teacher) return res.status(401).json({ error: 'Email ou password incorretos.' });
  const ok = await bcrypt.compare(String(password || ''), teacher.password_hash);
  if (!ok) return res.status(401).json({ error: 'Email ou password incorretos.' });
  res.json({ token: signToken(teacher) });
}));

module.exports = router;
