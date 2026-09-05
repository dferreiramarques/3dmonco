require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initSchema } = require('./db');

const authRoutes = require('./routes/auth');
const activitiesRoutes = require('./routes/activities');
const submissionsRoutes = require('./routes/submissions');
const teacherSubmissionsRoutes = require('./routes/teacherSubmissions');
const superadminRoutes = require('./routes/superadmin');

const app = express();
app.use(express.json({ limit: '2mb' }));

const allowedOrigins = (process.env.ALLOWED_ORIGIN || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
  methods: ['GET', 'POST', 'PUT', 'PATCH']
}));

app.get('/', (req, res) => res.json({ ok: true, service: 'monco3d-classroom-api' }));

app.use('/api/auth', authRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/teacher/submissions', teacherSubmissionsRoutes);
app.use('/api/superadmin', superadminRoutes);

// handler de erros genérico — evita expor stack traces ao cliente
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

const PORT = process.env.PORT || 3001;

initSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`monco3d-classroom-api a correr na porta ${PORT}`));
  })
  .catch(err => {
    console.error('Falha ao inicializar a base de dados:', err);
    process.exit(1);
  });
