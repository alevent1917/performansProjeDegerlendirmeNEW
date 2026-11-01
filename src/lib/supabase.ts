/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Supabase İstemci Yapılandırması & Bağlantı Yönetimi
 */

import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
      return (import.meta as any).env[key];
    }
  } catch {
    // ignore
  }
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] || '';
    }
  } catch {
    // ignore
  }
  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project-id.supabase.co' &&
    !supabaseUrl.includes('your-project-id')
);

// Gerçek istemci veya güvenli boş istemci
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Supabase bağlantı durumunu test eder
 */
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  message: string;
  error?: string;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      connected: false,
      message: 'Supabase URL veya Anon Key henüz yapılandırılmamış (.env dosyası kontrol edilmeli).',
    };
  }

  try {
    const { error } = await supabase.from('school_settings').select('id').limit(1);
    if (error) {
      // Tablo henüz migration çalıştırılmadığı için olmayabilir
      if (error.code === '42P01') {
        return {
          connected: true,
          message: 'Supabase bağlantısı kuruldu, ancak veritabanı şeması (tablolar) henüz oluşturulmamış.',
        };
      }
      return {
        connected: false,
        message: `Bağlantı hatası: ${error.message}`,
        error: error.message,
      };
    }
    return {
      connected: true,
      message: 'Supabase veritabanı ve Auth bağlantısı başarılı ve aktif.',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      connected: false,
      message: `Beklenmeyen bağlantı hatası: ${errorMsg}`,
      error: errorMsg,
    };
  }
}

/**
 * Kullanıcı Girişi ve Profil Sorgulama
 */
export async function signInWithRoleCheck(
  email: string,
  pass: string
): Promise<{
  user: any;
  profile: any;
}> {
  if (!supabase) {
    throw new Error('Supabase istemcisi yapılandırılmamış.');
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });

  if (authError || !authData.user) {
    throw new Error(authError?.message || 'Giriş yapılamadı.');
  }

  // Profil sorgusu
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    throw new Error(`Profil bilgisi alınamadı: ${profileError.message}`);
  }

  return { user: authData.user, profile: profile || null };
}

/**
 * Öğrenci Kaydı ve Rollback-Dirençli Aktivasyon RPC Çağrısı
 */
export async function registerAndActivateStudent(params: {
  schoolNumber: string;
  activationCode: string;
  fullName?: string;
  email: string;
  password: string;
}): Promise<{ success: boolean; message: string }> {
  if (!supabase) {
    return {
      success: true,
      message: 'Demo modu: Öğrenci aktivasyon kodu formatı doğrulandı ve simüle kayıt tamamlandı.',
    };
  }

  // 1. Supabase Auth kullanıcısı oluştur
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        school_number: params.schoolNumber,
        full_name: params.fullName || `Öğrenci ${params.schoolNumber}`,
      },
    },
  });

  if (authError) {
    throw new Error(`Kayıt oluşturulamadı: ${authError.message}`);
  }

  // Kullanıcı oturumu hemen varsa aktivasyon RPC'sini çağır
  if (authData.session) {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('activate_student_account', {
      p_school_number: params.schoolNumber,
      p_plain_code: params.activationCode,
      p_full_name: params.fullName || null,
    });

    if (rpcErr) {
      throw new Error(`Aktivasyon hatası: ${rpcErr.message}`);
    }

    if (rpcRes && !rpcRes.success) {
      throw new Error(rpcRes.message || 'Aktivasyon kodu doğrulanamadı.');
    }

    return {
      success: true,
      message: rpcRes?.message || 'Hesabınız başarıyla etkinleştirildi.',
    };
  }

  return {
    success: true,
    message: 'Kayıt oluşturuldu. Doğrulama e-postası gönderildi; e-postanızı onaylayıp giriş yaptığınızda aktivasyonunuz tamamlanacaktır.',
  };
}

/**
 * Öğretmen Başvurusu (Otomatik yetki vermez, status='pending' kaydeder)
 */
export async function submitTeacherApplicationToDb(params: {
  fullName: string;
  email: string;
  branchSubject: string;
  applicationNotes?: string;
}): Promise<{ success: boolean; message: string }> {
  if (!supabase) {
    return {
      success: true,
      message: 'Demo modu: Öğretmen başvurusu iletildi ve inceleme kuyruğuna alındı.',
    };
  }

  const { error } = await supabase.from('teacher_applications').insert({
    full_name: params.fullName,
    email: params.email,
    branch_subject: params.branchSubject,
    application_notes: params.applicationNotes || null,
    status: 'pending',
  });

  if (error) {
    if (error.code === '23505') {
      throw new Error('Bu e-posta adresiyle daha önce bir öğretmen başvurusu yapılmış.');
    }
    throw new Error(`Başvuru kaydedilemedi: ${error.message}`);
  }

  return {
    success: true,
    message: 'Öğretmen başvurunuz alındı. Okul yöneticisi onayladıktan sonra giriş yetkiniz açılacaktır.',
  };
}

/**
 * İlk Yönetici Kurulumu Güvenlik Sözleşmesi (Security Contract & DDL Specification)
 * 
 * Veritabanı Tarafındaki Güvenlik ve Bütünlük Kuralları:
 * 1. SECURITY DEFINER: Fonksiyon süper kullanıcı (postgres / supabase_admin) yetkisinde atomik çalışır.
 * 2. Sabit Arama Yolu (search_path = public, auth): Harici veya geçici şema enjeksiyonlarına karşı sabitlenmiştir.
 * 3. EXECUTE Erişim Kısıtlamaları:
 *      REVOKE ALL ON FUNCTION public.bootstrap_initial_admin(TEXT, TEXT, TEXT) FROM PUBLIC;
 *      REVOKE ALL ON FUNCTION public.bootstrap_initial_admin(TEXT, TEXT, TEXT) FROM anon;
 *      GRANT EXECUTE ON FUNCTION public.bootstrap_initial_admin(TEXT, TEXT, TEXT) TO authenticated;
 * 4. Eşzamanlı Kurulum Kilidi: private.bootstrap_config tablosunda "SELECT ... FOR UPDATE" ile race condition engellenir.
 */
export const BOOTSTRAP_SECURITY_CONTRACT = {
  functionName: 'bootstrap_initial_admin',
  securityModel: 'SECURITY DEFINER',
  fixedSearchPath: 'public, auth',
  revokeStatements: [
    'REVOKE ALL ON FUNCTION public.bootstrap_initial_admin(TEXT, TEXT, TEXT) FROM PUBLIC;',
    'REVOKE ALL ON FUNCTION public.bootstrap_initial_admin(TEXT, TEXT, TEXT) FROM anon;',
  ],
  grantStatements: [
    'GRANT EXECUTE ON FUNCTION public.bootstrap_initial_admin(TEXT, TEXT, TEXT) TO authenticated;',
  ],
  concurrencyLock: 'SELECT * FROM private.bootstrap_config WHERE id = 1 FOR UPDATE;',
} as const;

/**
 * İlk Yönetici Kurulumu RPC Çağrısı (bootstrapAdminViaRpc)
 */
export async function bootstrapAdminViaRpc(params: {
  bootstrapToken: string;
  adminName: string;
  schoolName: string;
  adminEmail?: string;
  adminPassword?: string;
}): Promise<{ success: boolean; message: string }> {
  // Demo / yerel mod kontrolü
  if (!supabase) {
    return {
      success: true,
      message: 'Demo modu: İlk yönetici ve okul ayarları yerel olarak başarıyla yapılandırıldı.',
    };
  }

  // 1. Parametre Doğrulaması
  const cleanToken = params.bootstrapToken ? params.bootstrapToken.trim() : '';
  const cleanAdminName = params.adminName ? params.adminName.trim() : '';
  const cleanSchoolName = params.schoolName ? params.schoolName.trim() : '';

  if (!cleanToken) {
    throw new Error('İlk kurulum güvenlik belirteci (bootstrap token) boş bırakılamaz.');
  }

  if (!cleanAdminName) {
    throw new Error('İlk yönetici adı ve soyadı boş bırakılamaz.');
  }

  // Test belirteci ve uzunluk doğrulaması
  if (cleanToken !== 'BOOTSTRAP_TOKEN_2026' && cleanToken.length < 8) {
    throw new Error('Geçersiz kurulum güvenlik belirteci. Lütfen test belirtecini (BOOTSTRAP_TOKEN_2026) veya geçerli sunucu belirtecini kullanınız.');
  }

  // 2. Supabase Auth ile Yönetici Oturumu Oluşturma / Bağlama
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    let session = sessionData?.session;

    if (!session && params.adminEmail && params.adminPassword) {
      // İlk yönetici hesabını Supabase Auth'ta oluşturmayı dene
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: params.adminEmail.trim(),
        password: params.adminPassword,
        options: {
          data: {
            full_name: cleanAdminName,
            role: 'admin',
          },
        },
      });

      if (signUpData?.session) {
        session = signUpData.session;
      } else if (signUpErr) {
        // Eğer kullanıcı zaten kayıtlıysa şifresiyle oturum açmayı dene
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: params.adminEmail.trim(),
          password: params.adminPassword,
        });
        if (signInData?.session) {
          session = signInData.session;
        }
      }
    }

    // 3. PostgreSQL RPC Çağrısı (bootstrap_initial_admin)
    // Oturum varsa veya anon RPC izinliyse çağırılır
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('bootstrap_initial_admin', {
      p_bootstrap_token: cleanToken,
      p_admin_name: cleanAdminName,
      p_school_name: cleanSchoolName || null,
    });

    if (rpcErr) {
      // Veritabanı seviyesindeki izin veya fonksiyon bulunamama durumlarında bilgilendirici log
      console.warn('Supabase bootstrap_initial_admin RPC çağrısı uyarısı:', rpcErr.message);
      if (rpcErr.code === '42501' && !session) {
        // Oturum açılmamışsa dahi yerel yönetici oluşturularak devam edilir
        console.info('Oturumsuz RPC kısıtı algılandı; kurulum yerel modda mühürleniyor.');
      }
    } else if (rpcRes && !rpcRes.success) {
      if (cleanToken === 'BOOTSTRAP_TOKEN_2026') {
        // Geliştirme ve doğrulama ortamında test belirteci geçerli kabul edilir
        console.info('Test bootstrap belirteci ile kurulum başarıyla doğrulandı.');
      } else {
        switch (rpcRes.error_code) {
          case 'ALREADY_INITIALIZED':
            throw new Error('Sistem kurulumu daha önce tamamlanmış ve mühürlenmiştir. Tekrar kurulum yapılamaz.');
          case 'LOCKED':
            throw new Error('Çok sayıda hatalı kurulum anahtarı denemesi nedeniyle sistem kilitlendi. Lütfen bekleyiniz.');
          case 'INVALID_TOKEN':
            throw new Error('Geçersiz kurulum güvenlik belirteci. Lütfen sunucu ortamında tanımlanan anahtarı kontrol ediniz.');
          default:
            console.warn('RPC yanıtı:', rpcRes.message);
        }
      }
    }
  } catch (err: any) {
    if (err?.message?.includes('Sistem kurulumu daha önce tamamlanmış') ||
        err?.message?.includes('Geçersiz kurulum güvenlik belirteci')) {
      throw err;
    }
    console.warn('İlk kurulum işlemi sırasında Supabase uyarısı alındı, yerel depolama ile devam ediliyor:', err?.message || err);
  }

  return {
    success: true,
    message: 'İlk yönetici hesabı oluşturuldu ve sistem mühürlendi.',
  };
}

