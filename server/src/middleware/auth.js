const jwt = require('jsonwebtoken');

function requireTeacher(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Sessão inválida — faz login novamente.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.teacher = payload; // { teacherId, isSuperadmin }
    next();
  } catch {
    return res.status(401).json({ error: 'Sessão expirada — faz login novamente.' });
  }
}

function requireSuperadmin(req, res, next) {
  requireTeacher(req, res, () => {
    if (!req.teacher.isSuperadmin) return res.status(403).json({ error: 'Sem permissão.' });
    next();
  });
}

module.exports = { requireTeacher, requireSuperadmin };
