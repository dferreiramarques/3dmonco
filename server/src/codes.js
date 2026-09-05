const crypto = require('crypto');

// sem caracteres ambíguos (0/O, 1/I/L)
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomCode(len = 4) {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return out;
}

function newClassroomCode() {
  return 'MONC-' + randomCode(4);
}

function normalizeCode(raw) {
  return String(raw || '').trim().toUpperCase();
}

function isValidPin(pin) {
  return /^\d{4}$/.test(String(pin || ''));
}

module.exports = { newClassroomCode, normalizeCode, isValidPin };
