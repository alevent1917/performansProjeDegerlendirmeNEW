# Performans & Proje Görev Takip Sistemi

T.C. Millî Eğitim Bakanlığı (MEB) ortaöğretim ve mesleki teknik eğitim kurumları standartlarına uygun; performans ve proje görevlerinin dağıtımı, öğrenci teslimleri (dijital PDF ve fiziki kâğıt), ölçüt bazlı değerlendirilmesi, resmi PDF ve yetkili Excel raporlanması ve güvenli takibi için geliştirilmiş kurumsal okul yönetim sistemidir.

---

## 1. Mimari Kararları ve Nedenleri

| Katman | Teknoloji / Hizmet | Tercih Nedeni ve Görevi |
|---|---|---|
| **Frontend** | React 19 + TypeScript + Vite + Tailwind CSS v4 | Hızlı yüklenen, mobil cihazlarla tam uyumlu, tip güvenli, modern ve erişilebilir kullanıcı arayüzü. Sıfır gereksiz bağımlılık. |
| **Backend / API** | Node.js (Express / tsx) | Sunucu tarafı yetki doğrulaması, dosya boyutu/türü kontrolleri, ZIP arşivleme ve Supabase Service Role anahtarının istemciden tamamen yalıtılması. |
| **Veritabanı & Auth** | Supabase (PostgreSQL 15+) | İlişkisel bütünlük, güçlü yabancı anahtarlar, indeksler, Row Level Security (RLS) politikaları ve güvenli kimlik doğrulama. |
| **Dosya Depolama** | Supabase Storage (Private Buckets) | 15 MB öğrenci PDF ve 20 MB öğretmen kaynak dosyaları için zaman sınırlı imzalı bağlantılar (Signed URLs) ile yetkilendirilmiş erişim. |
| **Sunucu & Yayın** | Oracle Cloud Free Tier (Ubuntu 24.04 LTS) | Ücretsiz kurumsal sunucu altyapısı, systemd servis yönetimi, Nginx ters proxy ve güvenlik duvarı (UFW + iptables). |

---

## 2. Proje Klasör Yapısı

```text
├── .env.example              # Ortam değişkenleri şablonu (Gizli anahtarlar asla Git'e eklenmez)
├── .gitignore                # Güvenli Git yoksayma kuralları (.env*, dist, node_modules)
├── index.html                # Türkçe HTML5 giriş noktası ve kurumsal meta etiketleri
├── metadata.json             # Uygulama adı ve yetki tanımları
├── package.json              # Bağımlılıklar ve çalıştırma komutları
├── tsconfig.json             # TypeScript katı tip denetim yapılandırması
├── vite.config.ts            # Vite derleyici ve Tailwind CSS eklentisi
├── README.md                 # Kapsamlı sistem ve dağıtım dokümantasyonu
├── src/
│   ├── main.tsx              # React bağlama noktası
│   ├── App.tsx               # Ana uygulama kabuğu ve aşama yönetim arayüzü
│   ├── index.css             # Tailwind CSS v4 direktifleri ve küresel stiller
│   ├── types/
│   │   └── index.ts          # Kullanıcı, rol, sınıf, ders, görev, ölçüt ve teslim veri tipleri
│   ├── lib/
│   │   ├── constants.ts      # Sistem sabitleri (2026-2027, 9-12/B sınıfları, dersler, dosya limitleri)
│   │   └── supabase.ts       # Supabase istemcisi ve canlı bağlantı doğrulayıcı
│   ├── utils/
│   │   ├── validation.ts     # Saf mantık: 100 puan kuralı, 0.1 hassasiyet, 15MB PDF, aktivasyon kodu formatı
│   │   └── validation.test.ts# Node.js yerleşik test koşucusu (node:test) ile birim testleri
│   └── components/
│       ├── Header.tsx        # Okul logolu, bildirim zilli ve rol göstergeli üst menü
│       ├── ConfirmModal.tsx  # Bölüm 21: Klavye destekli evrensel işlem onay penceresi
│       ├── HelpModal.tsx     # Bölüm 22: Öğrenci, Öğretmen ve Yönetici kılavuz sayfaları
│       ├── NotificationDrawer.tsx # Bölüm 15: Rol bazlı filtrelenmiş bildirim çekmecesi
│       ├── InitialSetupWizard.tsx # Bölüm 6: İlk yönetici ve okul yapılandırma sihirbazı
│       └── AuthCard.tsx      # Bölüm 5: Giriş, aktivasyon kodlu öğrenci kaydı, öğretmen başvurusu
```

---

## 3. Supabase Veritabanı Şeması Taslağı (Aşama 2 İçin)

Sistem aşağıdaki 18 ilişkisel tablodan oluşur:

1. `school_settings`: Okul adı, logo URL, aktif akademik yıl (2026–2027), zaman dilimi (Europe/Istanbul), dosya boyut sınırları.
2. `user_profiles`: Kullanıcı kimlikleri, ad soyad, rol (`student`, `teacher`, `admin`), durum (`active`, `passive`, `pending_approval`), okul numarası.
3. `classrooms`: 9/B, 10/B, 11/B, 12/B şubeleri, sınıf derecesi, akademik yıl, arşiv durumu.
4. `courses`: Programlama Temelleri, Ağ Sistemleri ve Anahtarlama dersleri ve kodları.
5. `teacher_permissions`: Öğretmenlerin yetkili olduğu sınıf ve ders eşleştirmeleri.
6. `activation_codes`: Öğrenciler için tek kullanımlık güvenli aktivasyon kodları (özet/hash formatında saklanır, kullanıldığında pasifleşir).
7. `teacher_applications`: Öğretmen adaylarının onay bekleyen başvuruları.
8. `rubric_templates`: Yeniden kullanılabilir ölçüt şablonları (toplam puanı mutlaka 100).
9. `rubric_criteria`: Şablon veya göreve bağlı ölçütler, açıklamalar ve maksimum puanlar.
10. `task_pools`: Kişisel ve zümre ile paylaşımlı görev havuzu öğeleri.
11. `task_assignments`: Sınıflara dağıtılan görevler, son teslim tarihi, teslim biçimi (dijital/kâğıt), geç teslim politikası.
12. `student_task_assignments`: Öğrenciye atanmış görev kaydı, güncel durum (`not_submitted`, `submitted`, `paper_reported`, `graded`).
13. `submission_versions`: Öğrencinin yüklediği PDF sürümleri (15 MB sınır, zaman damgası, eski sürümlerin korunması).
14. `extension_requests`: Öğrencinin mazeret ve ek süre talepleri, öğretmenin kabul/ret durumu.
15. `task_evaluations`: Değerlendirme başlığı, taslak (`draft`) veya kesinleşmiş (`finalized`), genel öğretmen yorumu, toplam puan.
16. `evaluation_criterion_scores`: Her ölçüt için 0.1 hassasiyetinde verilen puanlar ve ölçüt bazlı yorumlar.
17. `grade_change_logs`: Not değişikliklerinde eski puan, yeni puan, değiştiren öğretmen, tarih ve zorunlu gerekçe kaydı.
18. `system_notifications`: Rol ve kullanıcıya özel sistem içi bildirimler ve gecikme uyarıları.
19. `backup_logs`: Günlük otomatik yedekleme sonuçları ve 30 günlük saklama takibi.

---

## 4. Güvenlik Modeli ve İlk Kurulum Yaklaşımı

- **Row Level Security (RLS):** Supabase veritabanında tüm tablolarda RLS zorunludur. Öğrenci yalnızca kendi görev ve notlarını okuyabilir. Öğretmen yalnızca yetkilendirildiği sınıf/derse erişebilir ve yalnızca kendi atadığı görevleri puanlayabilir.
- **Service Role Key Yalıtımı:** `SUPABASE_SERVICE_ROLE_KEY` asla tarayıcı ortamına maruz bırakılmaz. Yalnızca Node.js güvenli sunucu tarafında çalıştırılır.
- **Tek Kullanımlık Aktivasyon Kodu:** Öğrenci kaydı yalnızca idare tarafından sağlanan tek kullanımlık kod ve sistemde tanımlı okul numarası ile açılabilir. Kod kullanıldıktan sonra tüketilir.
- **Oturum Güvenliği:** MEB standartları gereği 30 dakika hareketsizlik durumunda oturum otomatik olarak sonlandırılır.
- **Pasif Hesap Engeli:** Okuldan ayrılan veya mezun öğrencilerin kayıtları silinmez, pasife alınır. Pasif hesaplar giriş yapamaz.
- **İlk Kurulum Güvenliği:** İlk kurulum tamamlandığında ilk yönetici oluşturulur ve herkese açık yönetici kayıt kanalı kalıcı olarak kapatılır.

---

## 5. 10 Aşamalı Geliştirme ve Test Ölçütleri

| Aşama | Başlık | Tamamlanma & Test Ölçütleri |
|---|---|---|
| **Aşama 1** | Proje İskeleti & Mimari | TypeScript tipleri, 9 unit test (`node:test`), `.env.example`, Header, ConfirmModal, HelpModal ve derleme onayı. |
| **Aşama 2** | Veritabanı & Şema | 18 PostgreSQL tablosu, yabancı anahtarlar, Supabase migration SQL ve RLS politikalarının testi. |
| **Aşama 3** | Kimlik Doğrulama & Yetkiler | İlk yönetici sihirbazı, aktivasyon kodlu öğrenci kaydı, öğretmen onay akışı ve 30 dk oturum testi. |
| **Aşama 4** | Sınıflar, Dersler & Excel İçe Aktarma | Excel dosyasından önizlemeli öğrenci aktarımı, mükerrer kontrolü ve toplu aktivasyon kodu üretimi. |
| **Aşama 5** | Görev Havuzları & Dağıtım | 100 puanlık ölçüt doğrulama, taslak dağıtım önizleme ve öğretmen onay süreci. |
| **Aşama 6** | Teslimler & Bildirimler | 15 MB PDF format denetimi, sürüm geçmişi, kâğıt teslim onayı ve toplu ZIP indirme. |
| **Aşama 7** | Değerlendirme & Puanlama | 0.1 hassasiyetinde puanlama, taslak kaydetme ve not değişiklik kayıtları (log). |
| **Aşama 8** | PDF & Excel Raporları | MEB formatında ıslak imzalı PDF değerlendirme formu ve yetkili Excel dökümleri. |
| **Aşama 9** | Güvenlik & Kapsamlı Test | RLS sızıntı testleri, yetkisiz API çağrı engeli ve hata gizliliği denetimi. |
| **Aşama 10** | Yedekleme & Oracle Cloud Dağıtımı | Günlük yedekleme (30 gün saklama), Nginx ters proxy, systemd servis ve HTTPS yapılandırması. |

---

## 6. Hızlı Başlangıç (Geliştirme Ortamı)

### Bağımlılıkları Yükleme
```bash
npm install
```

### Birim Testlerini Çalıştırma (Node.js Built-in Test Runner)
```bash
npx --yes tsx --test src/utils/validation.test.ts
```

### Uygulamayı Geliştirme Modunda Başlatma
```bash
npm run dev
```
Uygulama `http://localhost:3000` adresinde çalışacaktır.

### Üretim Derlemesi ve Tip Denetimi
```bash
npm run lint
npm run build
```

---

## 7. Oracle Cloud Free Tier (Ubuntu) Kurulum ve Dağıtım Rehberi

### Adım 1: Ubuntu Sunucusuna SSH ile Bağlanma
Windows PowerShell veya macOS/Linux terminalinden:
```bash
ssh -i /path/to/your-private-key.key ubuntu@<ORACLE_INSTANCE_PUBLIC_IP>
```

### Adım 2: Sistem Paketlerini Güncelleme ve Node.js 22 Kurulumu
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx ufw

# Node.js 22 LTS Kurulumu
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v # v22.x.x doğrulaması
npm -v
```

### Adım 3: Projeyi Klonlama ve Çevre Değişkenlerini Tanımlama
```bash
cd /var/www
sudo git clone https://github.com/okul-bilesenleri/gorev-takip-sistemi.git
sudo chown -R ubuntu:ubuntu gorev-takip-sistemi
cd gorev-takip-sistemi

# Ortam değişkenlerini oluşturma
cp .env.example .env
nano .env # Supabase URL, Anon Key ve SMTP bilgilerini girip kaydediniz (Ctrl+O, Enter, Ctrl+X)
```

### Adım 4: Bağımlılıkların Yüklenmesi ve Derleme
```bash
npm install
npm run build
```

### Adım 5: Systemd Servisi Olarak Yapılandırma
Sistemin sunucu yeniden başladığında otomatik çalışması için:
```bash
sudo nano /etc/systemd/system/gorevtakip.service
```

Aşağıdaki içeriği yapıştırınız:
```ini
[Unit]
Description=Performans ve Proje Gorev Takip Sistemi
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/gorev-takip-sistemi
ExecStart=/usr/bin/npm run preview -- --port 3000 --host 127.0.0.1
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Servisi etkinleştirip başlatın:
```bash
sudo systemctl daemon-reload
sudo systemctl enable gorevtakip
sudo systemctl start gorevtakip
sudo systemctl status gorevtakip
```

### Adım 6: Nginx Ters Proxy (Reverse Proxy) Yapılandırması
```bash
sudo nano /etc/nginx/sites-available/gorevtakip
```

İçerik:
```nginx
server {
    listen 80;
    server_name <ORACLE_INSTANCE_PUBLIC_IP>;

    client_max_body_size 25M; # Öğrenci (15MB) ve Öğretmen (20MB) dosyaları için yeterli limit

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Nginx yapılandırmasını aktifleştirme:
```bash
sudo ln -s /etc/nginx/sites-available/gorevtakip /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### Adım 7: Güvenlik Duvarı (UFW ve Oracle VCN Security List)
1. **Ubuntu UFW Ayarı:**
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```
2. **Oracle Cloud Console Ayarı:**
   - *Networking* -> *Virtual Cloud Networks* -> *VCN* -> *Security Lists* -> *Default Security List for VCN*
   - *Add Ingress Rules*:
     - Source CIDR: `0.0.0.0/0`
     - IP Protocol: `TCP`
     - Destination Port Range: `80, 443`

*Not:* Başlangıçta IP üzerinden doğrudan yayında Let's Encrypt alan adı olmadığı için varsayılan olarak HTTP kullanılır. Alan adı tahsis edildiğinde `sudo certbot --nginx` komutuyla tek adımda ücretsiz güvenli HTTPS sertifikası kurulabilir.
