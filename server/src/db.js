const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false }
});

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS teachers (
      id uuid PRIMARY KEY,
      email text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      is_superadmin boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS activities (
      id uuid PRIMARY KEY,
      teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      classroom_code text UNIQUE NOT NULL,
      title text NOT NULL,
      brief text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id uuid PRIMARY KEY,
      activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
      student_name text NOT NULL,
      student_pin text NOT NULL,
      shapes_json jsonb NOT NULL DEFAULT '{"version":1,"nextId":1,"shapes":[]}',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_activities_teacher ON activities(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_activity ON submissions(activity_id);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_submissions_identity
      ON submissions(activity_id, lower(student_name), student_pin);
  `);
}

module.exports = { pool, initSchema };
