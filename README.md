# OkulSonrası.com 🚀

OkulSonrası, etüt merkezleri, kurslar ve okul sonrası eğitim kurumları için özel olarak tasarlanmış **Multi-Tenant (Çoklu İşletme)** destekli modern bir eğitim ve öğrenci yönetim sistemidir.

## 🌟 Özellikler

- **Multi-Tenant (Çoklu İşletme) Mimarisi:** Her etüt merkezi kendi izole alanında (Tenant) çalışır.
- **Güvenli Kimlik Doğrulama:** Supabase Auth entegrasyonu ile E-posta/Şifre ve **Google ile Giriş** seçenekleri.
- **Otomatik Onboarding:** Yeni üye olan işletmeler için şık ve yönlendirici "İşletmeni Kur" (Onboarding) akışı.
- **Kapsamlı Yönetim Paneli (`/admin`):** Kurum yöneticilerinin öğrencileri, harcamaları ve yoklamaları takip edebileceği merkezi panel.
- **Veli Bilgilendirme Ekranı (`/veli/[studentId]`):** Velilerin çocuklarının giriş-çıkış saatlerini (QR / PIN) ve harcama geçmişlerini anlık olarak takip edebildiği şeffaf arayüz.
- **Gelişmiş Satış ve POS (`/pos`):** Kantin veya kırtasiye satışları için hızlı Point of Sale (POS) sistemi.
- **Kiosk Modu (`/kiosk`):** Öğrencilerin kuruma giriş-çıkış yaparken QR kod veya PIN kullandıkları hızlı işlem ekranı.
- **Super Admin Paneli (`/super-admin`):** Tüm işletmelerin (tenant) sistem yöneticisi tarafından yönetilebildiği üst düzey kontrol paneli.

## 🛠️ Kullanılan Teknolojiler

- **Frontend:** [Next.js 16](https://nextjs.org/) (App Router & Turbopack), React, TypeScript
- **Stil & UI:** [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), Lucide Icons
- **Backend & Veritabanı:** [Supabase](https://supabase.com/) (PostgreSQL)
- **Veri Güvenliği:** Row Level Security (RLS) politikaları ve JWT Claim (app_metadata) entegrasyonu
- **State Yönetimi:** React Hooks & Supabase Realtime

## 🚀 Kurulum ve Çalıştırma

Projeyi yerel ortamınızda çalıştırmak için aşağıdaki adımları izleyin:

### 1. Depoyu Klonlayın
```bash
git clone https://github.com/miharbilore/okulsonras-.git
cd okulsonras-
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Çevre Değişkenlerini Ayarlayın
Proje ana dizininde bir `.env.local` dosyası oluşturun ve aşağıdaki Supabase değişkenlerini kendi projenize göre doldurun:
```env
NEXT_PUBLIC_SUPABASE_URL=senin_supabase_url_adresin
NEXT_PUBLIC_SUPABASE_ANON_KEY=senin_supabase_anon_key_degerin
SUPABASE_SERVICE_ROLE_KEY=senin_supabase_service_role_key_degerin
```

### 4. Geliştirme Sunucusunu Başlatın
```bash
npm run dev
```
Uygulama `http://localhost:3000` adresinde çalışmaya başlayacaktır.

## 🗄️ Veritabanı Mimarisi & RLS
Proje, verilerin birbirine karışmasını engellemek için katı **Row Level Security (RLS)** kuralları kullanır. 
- Bir kullanıcı kayıt olduğunda önce `auth.users` tablosuna eklenir.
- Otomatik tetikleyiciler (Triggers) ile `public.profiles` oluşturulur.
- Kullanıcı onboarding adımını tamamladığında, Supabase RPC (Remote Procedure Call) fonksiyonu aracılığıyla kendisine bir `Tenant (İşletme)` açılır ve bu bilgi kullanıcının çerezlerine (JWT Token) mühürlenir.
- RLS sayesinde, her işletme sadece kendi öğrencilerini ve verilerini görebilir.

## 🤝 Katkıda Bulunma
Bu proje özel bir girişimdir. Katkıda bulunmak isterseniz lütfen önce bir Issue açarak değişiklik önerinizi tartışın.

## 📄 Lisans
Tüm hakları saklıdır © 2026 OkulSonrası.com
