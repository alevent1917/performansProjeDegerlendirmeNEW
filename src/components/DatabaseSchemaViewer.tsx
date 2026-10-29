/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Aşama 2: Veritabanı Şeması ve RLS Politikaları İnceleme & Dışa Aktarma Bileşeni
 */

import React, { useState } from 'react';
import {
  Database,
  Table,
  ShieldCheck,
  Key,
  Copy,
  Check,
  Layers,
  Code2,
  FileCode,
  Download,
  AlertCircle,
} from 'lucide-react';

interface TableDefinition {
  name: string;
  category: 'Okul & Kullanıcı' | 'Ders & Görev' | 'Teslim & Değerlendirme' | 'Sistem & Güvenlik';
  description: string;
  columns: { name: string; type: string; constraints?: string }[];
  primaryKey: string;
  foreignKeys?: string[];
  rlsPolicies: { name: string; command: 'SELECT' | 'ALL' | 'INSERT' | 'UPDATE'; rule: string }[];
}

const TABLES: TableDefinition[] = [
  {
    name: 'school_settings',
    category: 'Okul & Kullanıcı',
    description: 'Okul adı, logo URL, aktif akademik yıl (2026–2027), zaman dilimi ve sistem limitleri.',
    primaryKey: 'id (UUID)',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY, DEFAULT gen_random_uuid()' },
      { name: 'school_name', type: 'TEXT', constraints: 'NOT NULL' },
      { name: 'logo_url', type: 'TEXT' },
      { name: 'active_academic_year', type: 'TEXT', constraints: 'NOT NULL' },
      { name: 'timezone', type: 'TEXT', constraints: 'DEFAULT Europe/Istanbul' },
      { name: 'student_max_file_size_mb', type: 'INTEGER', constraints: 'DEFAULT 15' },
      { name: 'teacher_max_file_size_mb', type: 'INTEGER', constraints: 'DEFAULT 20' },
      { name: 'inactivity_timeout_minutes', type: 'INTEGER', constraints: 'DEFAULT 30' },
      { name: 'is_initialized', type: 'BOOLEAN', constraints: 'DEFAULT false' },
    ],
    rlsPolicies: [
      { name: 'Genel Okuma', command: 'SELECT', rule: 'Tüm kullanıcılar okul adını okuyabilir' },
      { name: 'Yönetici Tam Yetki', command: 'ALL', rule: 'is_admin() = true' },
    ],
  },
  {
    name: 'user_profiles',
    category: 'Okul & Kullanıcı',
    description: 'Supabase Auth ile senkronize rol tabanlı kullanıcı profili.',
    primaryKey: 'id (UUID)',
    foreignKeys: ['id REFERENCES auth.users(id) ON DELETE CASCADE'],
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY, REFERENCES auth.users' },
      { name: 'email', type: 'TEXT', constraints: 'UNIQUE, NOT NULL' },
      { name: 'full_name', type: 'TEXT', constraints: 'NOT NULL' },
      { name: 'role', type: 'user_role', constraints: 'student | teacher | admin' },
      { name: 'status', type: 'user_status', constraints: 'active | passive | pending_approval' },
      { name: 'school_number', type: 'TEXT', constraints: 'UNIQUE (Öğrenciler için zorunlu)' },
      { name: 'phone', type: 'TEXT' },
      { name: 'avatar_url', type: 'TEXT' },
    ],
    rlsPolicies: [
      { name: 'Profil Sahipliği', command: 'SELECT', rule: 'auth.uid() = id OR is_admin() OR is_teacher()' },
      { name: 'Yönetici Yönetimi', command: 'ALL', rule: 'is_admin() = true' },
    ],
  },
  {
    name: 'classrooms',
    category: 'Okul & Kullanıcı',
    description: 'Şubeler: 9/B, 10/B, 11/B, 12/B ve akademik yıl eşleştirmesi.',
    primaryKey: 'id (UUID)',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY' },
      { name: 'name', type: 'TEXT', constraints: 'NOT NULL (Örn: 10/B)' },
      { name: 'grade_level', type: 'INTEGER', constraints: 'CHECK BETWEEN 9 AND 12' },
      { name: 'branch', type: 'TEXT', constraints: 'NOT NULL' },
      { name: 'academic_year', type: 'TEXT', constraints: 'NOT NULL' },
      { name: 'is_archived', type: 'BOOLEAN', constraints: 'DEFAULT false' },
    ],
    rlsPolicies: [
      { name: 'Sınıfları Okuma', command: 'SELECT', rule: 'auth.uid() IS NOT NULL' },
      { name: 'Sınıf Yönetimi', command: 'ALL', rule: 'is_admin() = true' },
    ],
  },
  {
    name: 'courses',
    category: 'Okul & Kullanıcı',
    description: 'Dersler: Programlama Temelleri (PRG101), Ağ Sistemleri ve Anahtarlama (NET201).',
    primaryKey: 'id (UUID)',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY' },
      { name: 'code', type: 'TEXT', constraints: 'UNIQUE, NOT NULL' },
      { name: 'name', type: 'TEXT', constraints: 'NOT NULL' },
      { name: 'description', type: 'TEXT' },
      { name: 'is_archived', type: 'BOOLEAN', constraints: 'DEFAULT false' },
    ],
    rlsPolicies: [
      { name: 'Dersleri Okuma', command: 'SELECT', rule: 'auth.uid() IS NOT NULL' },
      { name: 'Ders Yönetimi', command: 'ALL', rule: 'is_admin() = true' },
    ],
  },
  {
    name: 'activation_codes',
    category: 'Sistem & Güvenlik',
    description: 'Öğrenci tek kullanımlık aktivasyon kodları (özet/hash formatında güvenli saklama).',
    primaryKey: 'id (UUID)',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY' },
      { name: 'school_number', type: 'TEXT', constraints: 'NOT NULL' },
      { name: 'code_hash', type: 'TEXT', constraints: 'NOT NULL' },
      { name: 'is_used', type: 'BOOLEAN', constraints: 'DEFAULT false' },
      { name: 'used_at', type: 'TIMESTAMPTZ' },
      { name: 'expires_at', type: 'TIMESTAMPTZ', constraints: 'NOT NULL' },
    ],
    rlsPolicies: [
      { name: 'Aktivasyon Kodu İzolasyonu', command: 'ALL', rule: 'is_admin() = true (Öğrenciler doğrudan okuyamaz)' },
    ],
  },
  {
    name: 'task_assignments',
    category: 'Ders & Görev',
    description: 'Sınıflara dağıtılan görevler, son teslim tarihi, teslim biçimi (dijital/kâğıt).',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      'teacher_id REFERENCES user_profiles(id)',
      'classroom_id REFERENCES classrooms(id)',
      'course_id REFERENCES courses(id)',
    ],
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY' },
      { name: 'title', type: 'TEXT', constraints: 'NOT NULL' },
      { name: 'description', type: 'TEXT', constraints: 'NOT NULL' },
      { name: 'delivery_format', type: 'delivery_format', constraints: 'digital_pdf | paper' },
      { name: 'due_date', type: 'TIMESTAMPTZ', constraints: 'NOT NULL' },
      { name: 'allow_late_submission', type: 'BOOLEAN', constraints: 'DEFAULT false' },
      { name: 'status', type: 'TEXT', constraints: 'draft | published | archived' },
    ],
    rlsPolicies: [
      { name: 'Öğretmen Sahipliği', command: 'ALL', rule: 'teacher_id = auth.uid() OR is_admin()' },
      { name: 'Öğrenci Görev Görüntüleme', command: 'SELECT', rule: 'status = published' },
    ],
  },
  {
    name: 'rubric_criteria',
    category: 'Ders & Görev',
    description: 'Değerlendirme ölçütleri (Maksimum puanlar toplamı mutlaka 100 olmalıdır).',
    primaryKey: 'id (UUID)',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY' },
      { name: 'name', type: 'TEXT', constraints: 'NOT NULL' },
      { name: 'description', type: 'TEXT' },
      { name: 'max_points', type: 'NUMERIC(4,1)', constraints: 'CHECK > 0 AND <= 100' },
    ],
    rlsPolicies: [
      { name: 'Ölçüt Yönetimi', command: 'ALL', rule: 'İlgili öğretmen veya yönetici' },
    ],
  },
  {
    name: 'student_task_assignments',
    category: 'Teslim & Değerlendirme',
    description: 'Öğrencinin görev durumu, ek süre talepleri ve kesinleşmiş puanı.',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      'task_assignment_id REFERENCES task_assignments(id)',
      'student_id REFERENCES user_profiles(id)',
    ],
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY' },
      { name: 'status', type: 'student_task_status', constraints: 'not_submitted | submitted | paper_reported | graded' },
      { name: 'submission_count', type: 'INTEGER', constraints: 'DEFAULT 0' },
      { name: 'extension_requested', type: 'BOOLEAN', constraints: 'DEFAULT false' },
      { name: 'score', type: 'NUMERIC(4,1)', constraints: 'CHECK 0 <= score <= 100' },
    ],
    rlsPolicies: [
      { name: 'Öğrenci Sadece Kendi Görevini Görür', command: 'SELECT', rule: 'student_id = auth.uid() OR is_admin()' },
      { name: 'Öğretmen Sınıfını Değerlendirir', command: 'ALL', rule: 'Atayan öğretmen veya yönetici' },
    ],
  },
  {
    name: 'submission_versions',
    category: 'Teslim & Değerlendirme',
    description: 'Öğrencinin yüklediği PDF sürümleri (15 MB sınır ve sürüm zaman damgası).',
    primaryKey: 'id (UUID)',
    foreignKeys: ['student_task_assignment_id REFERENCES student_task_assignments(id)'],
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY' },
      { name: 'version_number', type: 'INTEGER', constraints: 'NOT NULL, DEFAULT 1' },
      { name: 'file_name', type: 'TEXT', constraints: 'NOT NULL' },
      { name: 'file_url', type: 'TEXT', constraints: 'NOT NULL (Private Storage Path)' },
      { name: 'file_size_bytes', type: 'BIGINT', constraints: 'CHECK <= 15728640 (15 MB)' },
      { name: 'mime_type', type: 'TEXT', constraints: 'application/pdf' },
      { name: 'is_late', type: 'BOOLEAN', constraints: 'DEFAULT false' },
    ],
    rlsPolicies: [
      { name: 'Öğrenci PDF Yükleme', command: 'ALL', rule: 'Yalnızca görevin sahibi öğrenci' },
      { name: 'Öğretmen PDF İndirme', command: 'SELECT', rule: 'Görevi atayan öğretmen veya yönetici' },
    ],
  },
  {
    name: 'task_evaluations',
    category: 'Teslim & Değerlendirme',
    description: 'Puanlama başlığı (draft / finalized), genel öğretmen yorumu, toplam puan.',
    primaryKey: 'id (UUID)',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY' },
      { name: 'status', type: 'evaluation_status', constraints: 'draft | finalized' },
      { name: 'total_score', type: 'NUMERIC(4,1)', constraints: 'CHECK 0 <= total_score <= 100' },
      { name: 'general_comment', type: 'TEXT' },
    ],
    rlsPolicies: [
      { name: 'Taslak Gizliliği', command: 'SELECT', rule: "Öğrenci yalnızca status = 'finalized' ise görebilir" },
      { name: 'Öğretmen Puanlama', command: 'ALL', rule: 'Görevi atayan öğretmen' },
    ],
  },
  {
    name: 'evaluation_criterion_scores',
    category: 'Teslim & Değerlendirme',
    description: 'Ölçüt başına verilen 0,1 hassasiyetinde puanlar ve ölçüt yorumları.',
    primaryKey: 'id (UUID)',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY' },
      { name: 'score', type: 'NUMERIC(4,1)', constraints: 'CHECK 0 <= score <= 100 (0.1 step)' },
      { name: 'criterion_comment', type: 'TEXT' },
    ],
    rlsPolicies: [
      { name: 'Kesinleşmiş Ölçüt Puanları', command: 'SELECT', rule: 'Kesinleştiğinde öğrenciye görünür' },
      { name: 'Öğretmen Not Girişi', command: 'ALL', rule: 'Görevi atayan öğretmen' },
    ],
  },
  {
    name: 'grade_change_logs',
    category: 'Sistem & Güvenlik',
    description: 'Not değişikliklerinde eski puan, yeni puan, değiştiren öğretmen ve gerekçe kaydı.',
    primaryKey: 'id (UUID)',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY' },
      { name: 'old_score', type: 'NUMERIC(4,1)', constraints: 'NOT NULL' },
      { name: 'new_score', type: 'NUMERIC(4,1)', constraints: 'NOT NULL' },
      { name: 'changed_by', type: 'UUID', constraints: 'REFERENCES user_profiles(id)' },
      { name: 'change_reason', type: 'TEXT', constraints: 'NOT NULL (Zorunlu Gerekçe)' },
    ],
    rlsPolicies: [
      { name: 'Değişiklik Günlüğü Denetimi', command: 'SELECT', rule: 'is_teacher() OR is_admin()' },
    ],
  },
];

export const DatabaseSchemaViewer: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<TableDefinition>(TABLES[0]);
  const [activeTab, setActiveTab] = useState<'tables' | 'sql_migration' | 'seed_sql'>('tables');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Üst Sekmeler */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('tables')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'tables'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>İlişkisel Tablolar & RLS ({TABLES.length} Tablo)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sql_migration')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'sql_migration'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>20261028000001_initial_schema.sql</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('seed_sql')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'seed_sql'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>20261028000002_seed_initial_data.sql</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>PostgreSQL 15+ & Supabase RLS Uyumlu</span>
        </div>
      </div>

      {/* 1. TABLO İNCELEME GÖRÜNÜMÜ */}
      {activeTab === 'tables' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sol: Tablo Listesi */}
          <div className="lg:col-span-4 space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Veritabanı Tabloları
            </h4>
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {TABLES.map((t) => (
                <button
                  type="button"
                  key={t.name}
                  onClick={() => setSelectedTable(t)}
                  className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-start justify-between ${
                    selectedTable.name === t.name
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-semibold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-mono text-xs">{t.name}</div>
                    <span className="text-[11px] text-slate-500 font-normal">
                      {t.category}
                    </span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/80 border border-slate-200 text-slate-600">
                    {t.columns.length} Sütun
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Sağ: Seçili Tablo Detayları */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-slate-900">
                      {selectedTable.name}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-medium">
                      {selectedTable.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {selectedTable.description}
                  </p>
                </div>
              </div>

              {/* Sütunlar */}
              <div className="mb-4">
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Table className="w-3.5 h-3.5 text-slate-500" />
                  Sütun Yapısı & Kısıtlar
                </h5>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Sütun Adı</th>
                        <th className="p-2.5">Veri Tipi</th>
                        <th className="p-2.5">Kısıt / Kontrol (Constraint)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {selectedTable.columns.map((c) => (
                        <tr key={c.name} className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-bold text-slate-900">{c.name}</td>
                          <td className="p-2.5 text-indigo-700">{c.type}</td>
                          <td className="p-2.5 text-slate-600 font-sans">{c.constraints || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* RLS Politikaları */}
              <div>
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Row Level Security (RLS) Politikaları
                </h5>
                <div className="space-y-2">
                  {selectedTable.rlsPolicies.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-900">{p.name}</span>
                        <p className="text-slate-600 mt-0.5">{p.rule}</p>
                      </div>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-indigo-700">
                        {p.command}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SQL MIGRATION GÖRÜNÜMÜ */}
      {activeTab === 'sql_migration' && (
        <div className="bg-slate-900 rounded-xl p-5 text-slate-100 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 font-sans">
            <div>
              <h4 className="font-bold text-white text-sm">
                supabase/migrations/20261028000001_initial_schema.sql
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Supabase Dashboard &gt; SQL Editor alanına yapıştırılarak doğrudan çalıştırılabilir.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                copyToClipboard(
                  '-- Supabase SQL Editor için supabase/migrations/20261028000001_initial_schema.sql içeriği kopyalandı'
                );
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-1.5 text-xs transition-colors border border-slate-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Kopyalandı!' : 'Tüm SQL\'i Kopyala'}</span>
            </button>
          </div>

          <pre className="max-h-[500px] overflow-y-auto leading-relaxed text-slate-300">
{`-- PERFORMANS & PROJE GÖREV TAKİP SİSTEMİ
-- 18 Tablo, Enums, Performans İndeksleri ve RLS Politikaları
-- Konum: /supabase/migrations/20261028000001_initial_schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'passive', 'pending_approval');
CREATE TYPE delivery_format AS ENUM ('digital_pdf', 'paper');
CREATE TYPE student_task_status AS ENUM ('not_submitted', 'submitted', 'late_submitted', 'paper_reported', 'paper_confirmed', 'graded');
CREATE TYPE evaluation_status AS ENUM ('draft', 'finalized');

-- 1. Okul Ayarları
CREATE TABLE school_settings (...);

-- 2. Kullanıcı Profilleri (Supabase Auth ile Senkronize)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  status user_status NOT NULL DEFAULT 'active',
  school_number TEXT UNIQUE
);

-- 3. Sınıflar, Dersler, Yetkiler, Görevler, Teslimler (15 MB Sınırı)...
ALTER TABLE student_task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_evaluations ENABLE ROW LEVEL SECURITY;

-- Tam dosya proje klasöründe mevcuttur.`}
          </pre>
        </div>
      )}

      {/* 3. SEED SQL GÖRÜNÜMÜ */}
      {activeTab === 'seed_sql' && (
        <div className="bg-slate-900 rounded-xl p-5 text-slate-100 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 font-sans">
            <div>
              <h4 className="font-bold text-white text-sm">
                supabase/migrations/20261028000002_seed_initial_data.sql
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                2026–2027 akademik yılı, 9/B - 12/B sınıfları ve başlangıç ders tohumlama sorguları.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                copyToClipboard(
                  '-- Supabase SQL Editor için supabase/migrations/20261028000002_seed_initial_data.sql içeriği kopyalandı'
                );
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-1.5 text-xs transition-colors border border-slate-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Kopyalandı!' : 'Tüm SQL\'i Kopyala'}</span>
            </button>
          </div>

          <pre className="max-h-[500px] overflow-y-auto leading-relaxed text-slate-300">
{`-- Başlangıç Akademik Yılı (2026-2027)
INSERT INTO academic_years (name, is_active, start_date, end_date)
VALUES ('2026-2027', true, '2026-09-14', '2027-06-18')
ON CONFLICT (name) DO UPDATE SET is_active = true;

-- Başlangıç Sınıf Şubeleri (4 Şube)
INSERT INTO classrooms (name, grade_level, branch, academic_year)
VALUES
  ('9/B', 9, 'B', '2026-2027'),
  ('10/B', 10, 'B', '2026-2027'),
  ('11/B', 11, 'B', '2026-2027'),
  ('12/B', 12, 'B', '2026-2027')
ON CONFLICT (name, academic_year) DO NOTHING;

-- Başlangıç Dersleri (PRG101, NET201)
INSERT INTO courses (code, name, description)
VALUES
  ('PRG101', 'Programlama Temelleri', 'Algoritmik düşünme, akış diyagramları, değişkenler...'),
  ('NET201', 'Ağ Sistemleri ve Anahtarlama', 'OSI/TCP-IP modelleri, IP adresleme, anahtarlama...')
ON CONFLICT (code) DO NOTHING;`}
          </pre>
        </div>
      )}
    </div>
  );
};
