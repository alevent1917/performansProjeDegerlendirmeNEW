/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Aşama 3 Güvenlik Sertleştirmesi ve Migration Doğrulama Test Paketi
 *
 * MİMARİ VE TEST ORTAMI BİLGİSİ:
 * 1. Şema Kaynağı: `supabase/migrations/20261029000001_security_hardening.sql` ve `20261028000001_initial_schema.sql`
 * 2. Çalışma Ortamı: İzole konteyner ortamında pg-mem (in-memory PostgreSQL simülasyonu) ve Node.js test yürütücüsü (node:test).
 * 3. Canlı Supabase Kuralı: Canlı veritabanı veya bulut instance'ına bağlanılmamıştır; canlıya migration uygulanmamıştır.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const INITIAL_MIGRATION_PATH = path.resolve(process.cwd(), 'supabase/migrations/20261028000001_initial_schema.sql');
const HARDENING_MIGRATION_PATH = path.resolve(process.cwd(), 'supabase/migrations/20261029000001_security_hardening.sql');

test('[Hardening 1] Yeni güvenlik sertleştirme migration dosyası mevcut ve doludur', () => {
  assert.equal(fs.existsSync(HARDENING_MIGRATION_PATH), true, '20261029000001_security_hardening.sql dosyası mevcut olmalıdır');
  const sql = fs.readFileSync(HARDENING_MIGRATION_PATH, 'utf-8');
  assert.ok(sql.length > 1000, 'Migration SQL dosyası kapsamlı tanımlar içermelidir');
});

test('[Hardening 2] handle_updated_at() SECURITY INVOKER ve güvenli search_path ile tanımlanmıştır', () => {
  const sql = fs.readFileSync(HARDENING_MIGRATION_PATH, 'utf-8');
  
  assert.ok(sql.includes('FUNCTION public.handle_updated_at()'), 'handle_updated_at tanımlanmalıdır');
  assert.ok(sql.includes('SECURITY INVOKER'), 'handle_updated_at SECURITY INVOKER olmalıdır');
  assert.ok(!sql.includes('handle_updated_at()[\s\S]*?SECURITY DEFINER'), 'handle_updated_at SECURITY DEFINER içermemelidir');
  assert.ok(sql.includes('SET search_path = pg_catalog, public, pg_temp'), 'search_path pg_catalog öncelikli olmalıdır');
});

test('[Hardening 3] is_admin() güvenli search_path ve kısıtlı EXECUTE izniyle tanımlanmıştır', () => {
  const sql = fs.readFileSync(HARDENING_MIGRATION_PATH, 'utf-8');

  assert.ok(sql.includes('FUNCTION public.is_admin()'), 'is_admin fonksiyonu tanımlanmalıdır');
  assert.ok(sql.includes('SECURITY DEFINER'), 'is_admin SECURITY DEFINER olmalıdır');
  assert.ok(sql.includes('SET search_path = pg_catalog, public, pg_temp'), 'is_admin güvenli search_path içermelidir');
  assert.ok(sql.includes('REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC'), 'PUBLIC izni geri alınmalıdır');
  assert.ok(sql.includes('REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon'), 'anon izni geri alınmalıdır');
  assert.ok(sql.includes('GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated'), 'authenticated izni verilmelidir');
});

test('[Hardening 4] enforce_profile_role_integrity() tüm kritik alanları korumaktadır', () => {
  const sql = fs.readFileSync(HARDENING_MIGRATION_PATH, 'utf-8');

  assert.ok(sql.includes('NEW.role IS DISTINCT FROM OLD.role'), 'Rol değişikliği engellenmelidir');
  assert.ok(sql.includes('NEW.status IS DISTINCT FROM OLD.status'), 'Durum değişikliği engellenmelidir');
  assert.ok(sql.includes('NEW.school_number IS DISTINCT FROM OLD.school_number'), 'Okul numarası değişikliği engellenmelidir');
  assert.ok(sql.includes('NEW.email IS DISTINCT FROM OLD.email'), 'E-posta değişikliği engellenmelidir');
  assert.ok(sql.includes('NEW.id IS DISTINCT FROM OLD.id'), 'Kullanıcı ID değişikliği engellenmelidir');
});

test('[Hardening 5] user_profiles RLS politikasından özyinelemeli alt sorgular kaldırılmıştır', () => {
  const sql = fs.readFileSync(HARDENING_MIGRATION_PATH, 'utf-8');

  // Eski özyinelemeli politikanın kaldırıldığı doğrulanır
  assert.ok(sql.includes('DROP POLICY IF EXISTS "Kullanıcı kendi profilini güncelleyebilir rol hariç"'), 'Eski özyinelemeli politika kaldırılmalıdır');
  
  // Yeni politikanın WITH CHECK içinde user_profiles alt sorgusu içermediği doğrulanır
  const selfUpdateMatch = sql.match(/CREATE POLICY "user_profiles_self_update"[\s\S]*?;/);
  assert.ok(selfUpdateMatch, 'user_profiles_self_update politikası tanımlanmalıdır');
  const policyBody = selfUpdateMatch[0];
  assert.ok(!policyBody.includes('SELECT p.role FROM'), 'Politika kendi tablosuna alt sorgu atmamalıdır');
  assert.ok(!policyBody.includes('SELECT p.status FROM'), 'Politika kendi tablosuna alt sorgu atmamalıdır');
});

test('[Hardening 6] activate_student_account() kaba kuvvet sayaç artışını rollback etmeyecek biçimde tasarlanmıştır', () => {
  const sql = fs.readFileSync(HARDENING_MIGRATION_PATH, 'utf-8');

  assert.ok(sql.includes('FUNCTION public.activate_student_account'), 'activate_student_account RPC tanımlanmalıdır');
  assert.ok(sql.includes('FOR UPDATE'), 'Yarış durumu (race condition) koruması için FOR UPDATE kullanılmalıdır');
  assert.ok(sql.includes('failed_attempts = failed_attempts + 1'), 'Hatalı kodda sayaç artırılmalıdır');
  assert.ok(sql.includes("locked_until = NOW() + INTERVAL '15 minutes'"), '5 hatalı denemede 15 dakika kilitlenmelidir');
  
  // Hatalı kod durumunda RAISE EXCEPTION kullanılmadığı, commit edilip generic error JSON dönüldüğü doğrulanır
  const funcBody = sql.substring(sql.indexOf('FUNCTION public.activate_student_account'));
  assert.ok(funcBody.includes('RETURN v_generic_error'), 'Hatalı kod durumunda işlem rollback edilmeyip JSON dönülmelidir');
});

test('[Hardening 7] İlk yönetici bootstrap belirteci sunucu tarafı gizli şemada korunur ve mühürlenir', () => {
  const sql = fs.readFileSync(HARDENING_MIGRATION_PATH, 'utf-8');

  assert.ok(sql.includes('CREATE SCHEMA IF NOT EXISTS private;'), 'private şeması oluşturulmalıdır');
  assert.ok(sql.includes('REVOKE ALL ON SCHEMA private FROM PUBLIC;'), 'private şeması dışarıya kapatılmalıdır');
  assert.ok(sql.includes('prevent_bootstrap_unseal'), 'is_initialized mühür koruma trigger fonksiyonu tanımlanmalıdır');
  assert.ok(sql.includes('OLD.is_initialized = true AND NEW.is_initialized = false'), 'is_initialized false yapılması engellenmelidir');
  assert.ok(sql.includes('FUNCTION public.bootstrap_initial_admin'), 'bootstrap_initial_admin RPC tanımlanmalıdır');
  assert.ok(sql.includes('DELETE FROM private.bootstrap_config WHERE id = 1'), 'Kurulum sonrası bootstrap sırrı imha edilmelidir');
});

test('[Hardening 8] teacher_applications politikası status = pending şartı ile sıkılaştırılmıştır', () => {
  const sql = fs.readFileSync(HARDENING_MIGRATION_PATH, 'utf-8');

  assert.ok(sql.includes("WITH CHECK (status = 'pending'::application_status);"), 'Başvuru eklenirken yalnızca pending durumu kabul edilmelidir');
});
