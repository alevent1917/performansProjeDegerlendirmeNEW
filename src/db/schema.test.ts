import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const MIGRATION_PATH = path.resolve(process.cwd(), 'supabase/migrations/20261028000001_initial_schema.sql');
const SEED_PATH = path.resolve(process.cwd(), 'supabase/migrations/20261028000002_seed_initial_data.sql');

test('Database migration file exists and is non-empty', () => {
  assert.equal(fs.existsSync(MIGRATION_PATH), true);
  const sqlContent = fs.readFileSync(MIGRATION_PATH, 'utf-8');
  assert.ok(sqlContent.length > 500, 'Migration SQL should contain significant schema definitions');
});

test('Schema defines all required 18 core tables', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');

  const requiredTables = [
    'school_settings',
    'academic_years',
    'user_profiles',
    'classrooms',
    'courses',
    'teacher_permissions',
    'activation_codes',
    'teacher_applications',
    'rubric_templates',
    'rubric_criteria',
    'task_pools',
    'task_assignments',
    'student_task_assignments',
    'submission_versions',
    'task_evaluations',
    'evaluation_criterion_scores',
    'grade_change_logs',
    'system_notifications',
    'backup_logs',
  ];

  for (const table of requiredTables) {
    const tableRegex = new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`, 'i');
    assert.ok(tableRegex.test(sql), `Table "${table}" must be declared in migration SQL`);
  }
});

test('Row Level Security (RLS) is explicitly enabled on all critical tables', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');

  const rlsTables = [
    'school_settings',
    'user_profiles',
    'classrooms',
    'courses',
    'teacher_permissions',
    'activation_codes',
    'task_assignments',
    'student_task_assignments',
    'submission_versions',
    'task_evaluations',
    'evaluation_criterion_scores',
    'grade_change_logs',
    'system_notifications',
  ];

  for (const table of rlsTables) {
    const rlsRegex = new RegExp(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`, 'i');
    assert.ok(rlsRegex.test(sql), `Table "${table}" must have ENABLE ROW LEVEL SECURITY`);
  }
});

test('Check constraints enforce domain rules strictly in SQL', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');

  // 15 MB file size limit constraint (15 * 1024 * 1024 = 15728640)
  assert.ok(sql.includes('15728640'), 'Must enforce 15 MB file size limit in submission_versions');

  // Score bounds (0 to 100)
  assert.ok(sql.includes('score >= 0 AND score <= 100'), 'Must enforce 0-100 score bounds');

  // Max points constraint
  assert.ok(sql.includes('max_points <= 100'), 'Must enforce max_points <= 100');

  // School number requirement for students
  assert.ok(sql.includes('check_student_school_number'), 'Must enforce student school number requirement');
});

test('Seed file contains Section 6 mandated baseline classes and courses', () => {
  assert.equal(fs.existsSync(SEED_PATH), true);
  const seedSql = fs.readFileSync(SEED_PATH, 'utf-8');

  // Academic year 2026-2027
  assert.ok(seedSql.includes('2026-2027'), 'Seed must contain 2026-2027 academic year');

  // Initial classes
  assert.ok(seedSql.includes("'9/B'"), 'Seed must contain 9/B');
  assert.ok(seedSql.includes("'10/B'"), 'Seed must contain 10/B');
  assert.ok(seedSql.includes("'11/B'"), 'Seed must contain 11/B');
  assert.ok(seedSql.includes("'12/B'"), 'Seed must contain 12/B');

  // Initial courses
  assert.ok(seedSql.includes('Programlama Temelleri'), 'Seed must contain Programlama Temelleri');
  assert.ok(seedSql.includes('Ağ Sistemleri ve Anahtarlama'), 'Seed must contain Ağ Sistemleri ve Anahtarlama');
  assert.ok(seedSql.includes('PRG101'), 'Seed must contain PRG101');
  assert.ok(seedSql.includes('NET201'), 'Seed must contain NET201');
});
