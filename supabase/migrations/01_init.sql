-- ============================================================================
-- OKULSONRASI.COM — Multi-Tenant SaaS Veritabanı Şeması
-- Supabase (PostgreSQL) · Versiyon: 1.0
-- ============================================================================
-- Bu betik Supabase SQL Editor'de tek tıkla çalıştırılabilir.
-- Tüm tablolarda tenant_id zorunludur ve RLS ile izole edilir.
-- ============================================================================

-- =========================
-- 0. ÖN HAZIRLIK
-- =========================

-- UUID üreteci (Supabase'de genellikle zaten aktiftir, güvenlik amaçlı tekrar)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- 1. YARDIMCI FONKSİYON
-- =========================

-- JWT içindeki app_metadata.tenant_id değerini döndürür.
-- Kiosk / POS cihazları Supabase service_role veya özel token ile
-- bu değeri set ederek sorgu atar.
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::jsonb
      -> 'app_metadata' ->> 'tenant_id',
    ''
  )::uuid;
$$;

COMMENT ON FUNCTION public.current_tenant_id()
  IS 'JWT app_metadata içinden aktif tenant_id değerini çıkarır.';


-- =========================
-- 2. TABLOLAR
-- =========================

-- ─────────────────────────
-- 2.1  tenants
-- ─────────────────────────
CREATE TABLE public.tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  logo_url    TEXT,
  whatsapp_api_key TEXT,                       -- WhatsApp Business entegrasyonu
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Slug benzersiz olmalı (URL yönlendirmesi için)
ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_slug_unique UNIQUE (slug);

COMMENT ON TABLE public.tenants IS 'Platform üzerindeki işletmeler (okullar, kurslar vb.)';

-- ─────────────────────────
-- 2.2  students
-- ─────────────────────────
CREATE TABLE public.students (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  parent_name   TEXT,
  parent_phone  TEXT,                          -- Veli telefon numarası
  qr_code_id    TEXT,                          -- Kiosk QR ile giriş
  pin_code      VARCHAR(4),                    -- Kiosk PIN ile giriş
  weekly_limit  NUMERIC(10,2) DEFAULT 0.00,    -- Haftalık harcama limiti (₺)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- qr_code_id aynı tenant içinde benzersiz olmalı, farklı tenantlarda aynı kod olabilir
ALTER TABLE public.students
  ADD CONSTRAINT students_qr_code_unique_per_tenant UNIQUE (tenant_id, qr_code_id);

-- pin_code da aynı tenant içinde benzersiz
ALTER TABLE public.students
  ADD CONSTRAINT students_pin_code_unique_per_tenant UNIQUE (tenant_id, pin_code);

COMMENT ON TABLE public.students IS 'Öğrenci kayıtları. Her kayıt mutlaka bir tenant_id taşır.';

-- ─────────────────────────
-- 2.3  products
-- ─────────────────────────
CREATE TABLE public.products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  price       NUMERIC(10,2) NOT NULL,
  category    TEXT,                             -- Ürün kategorisi (yiyecek, içecek vb.)
  is_active   BOOLEAN NOT NULL DEFAULT true,    -- Pasif ürünler POS ekranında görünmez
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.products IS 'Kafe / kantin ürün kataloğu.';

-- ─────────────────────────
-- 2.4  attendances
-- ─────────────────────────
CREATE TABLE public.attendances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  check_in_type   TEXT NOT NULL CHECK (check_in_type IN ('qr', 'pin')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.attendances IS 'Kiosk giriş kayıtları (QR veya PIN).';

-- ─────────────────────────
-- 2.5  transactions
-- ─────────────────────────
CREATE TABLE public.transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  items         JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{product_id, name, price, qty}]
  total_amount  NUMERIC(10,2) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.transactions IS 'Kafe satış işlemleri. items alanı satılan ürünlerin anlık fiyat bilgisini tutar.';


-- =========================
-- 3. ROW LEVEL SECURITY
-- =========================
-- Her tabloda RLS aktif + USING (okuma/güncelleme/silme) ve WITH CHECK (ekleme/güncelleme)
-- politikaları ile tam izolasyon sağlanır.

-- ─── tenants ──────────────────────
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenants_select" ON public.tenants
  FOR SELECT USING (id = public.current_tenant_id());

CREATE POLICY "tenants_insert" ON public.tenants
  FOR INSERT WITH CHECK (id = public.current_tenant_id());

CREATE POLICY "tenants_update" ON public.tenants
  FOR UPDATE USING (id = public.current_tenant_id())
             WITH CHECK (id = public.current_tenant_id());

CREATE POLICY "tenants_delete" ON public.tenants
  FOR DELETE USING (id = public.current_tenant_id());

-- ─── students ─────────────────────
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_select" ON public.students
  FOR SELECT USING (tenant_id = public.current_tenant_id());

CREATE POLICY "students_insert" ON public.students
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "students_update" ON public.students
  FOR UPDATE USING (tenant_id = public.current_tenant_id())
             WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "students_delete" ON public.students
  FOR DELETE USING (tenant_id = public.current_tenant_id());

-- ─── products ─────────────────────
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select" ON public.products
  FOR SELECT USING (tenant_id = public.current_tenant_id());

CREATE POLICY "products_insert" ON public.products
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "products_update" ON public.products
  FOR UPDATE USING (tenant_id = public.current_tenant_id())
             WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "products_delete" ON public.products
  FOR DELETE USING (tenant_id = public.current_tenant_id());

-- ─── attendances ──────────────────
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendances_select" ON public.attendances
  FOR SELECT USING (tenant_id = public.current_tenant_id());

CREATE POLICY "attendances_insert" ON public.attendances
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "attendances_update" ON public.attendances
  FOR UPDATE USING (tenant_id = public.current_tenant_id())
             WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "attendances_delete" ON public.attendances
  FOR DELETE USING (tenant_id = public.current_tenant_id());

-- ─── transactions ─────────────────
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_select" ON public.transactions
  FOR SELECT USING (tenant_id = public.current_tenant_id());

CREATE POLICY "transactions_insert" ON public.transactions
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "transactions_update" ON public.transactions
  FOR UPDATE USING (tenant_id = public.current_tenant_id())
             WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "transactions_delete" ON public.transactions
  FOR DELETE USING (tenant_id = public.current_tenant_id());


-- =========================
-- 4. PERFORMANS İNDEKSLERİ
-- =========================

-- ─── Tenant İzolasyon İndeksleri ──
-- Her tabloda tenant_id üzerinden filtreleme yapılır; bu indeksler RLS'in performansını artırır.
CREATE INDEX idx_students_tenant      ON public.students     (tenant_id);
CREATE INDEX idx_products_tenant      ON public.products     (tenant_id);
CREATE INDEX idx_attendances_tenant   ON public.attendances  (tenant_id);
CREATE INDEX idx_transactions_tenant  ON public.transactions (tenant_id);

-- ─── Kiosk Giriş Aramaları ────────
-- QR kod ile öğrenci arama (Kiosk ekranı): tenant + qr_code_id
CREATE INDEX idx_students_tenant_qr   ON public.students (tenant_id, qr_code_id)
  WHERE qr_code_id IS NOT NULL;

-- PIN kodu ile öğrenci arama (Kiosk ekranı): tenant + pin_code
CREATE INDEX idx_students_tenant_pin  ON public.students (tenant_id, pin_code)
  WHERE pin_code IS NOT NULL;

-- ─── Yoklama Sorguları ────────────
-- Bugünkü yoklamaları hızlı listelemek için (tenant + tarih)
CREATE INDEX idx_attendances_tenant_date
  ON public.attendances (tenant_id, created_at DESC);

-- Belirli bir öğrencinin yoklama geçmişi
CREATE INDEX idx_attendances_student
  ON public.attendances (student_id, created_at DESC);

-- ─── Satış / Bakiye Sorguları ─────
-- Haftalık harcama limiti kontrolü: tenant + öğrenci + tarih
CREATE INDEX idx_transactions_tenant_student_date
  ON public.transactions (tenant_id, student_id, created_at DESC);

-- Belirli bir öğrencinin toplam harcamasını hızlıca hesaplamak için
CREATE INDEX idx_transactions_student
  ON public.transactions (student_id, created_at DESC);

-- Aktif ürünleri POS ekranında listelemek için
CREATE INDEX idx_products_tenant_active
  ON public.products (tenant_id, is_active)
  WHERE is_active = true;

-- ─── Tenant Slug Araması ──────────
-- /kiosk/[slug] sayfasında tenant bilgisini çekmek için
CREATE INDEX idx_tenants_slug ON public.tenants (slug);


-- =========================
-- 5. YARDIMCI: HAFTALIK HARCAMA HESAPLAMA FONKSİYONU
-- =========================

-- Belirli bir öğrencinin bu haftaki toplam harcamasını döndürür.
-- POS ekranında satış öncesi limit kontrolü için kullanılır.
CREATE OR REPLACE FUNCTION public.get_weekly_spending(
  p_student_id UUID
)
RETURNS NUMERIC
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(SUM(total_amount), 0)
  FROM public.transactions
  WHERE student_id = p_student_id
    AND tenant_id  = public.current_tenant_id()
    AND created_at >= date_trunc('week', now());
$$;

COMMENT ON FUNCTION public.get_weekly_spending(UUID)
  IS 'Bir öğrencinin içinde bulunduğu haftadaki toplam harcamasını (₺) döndürür.';


-- ============================================================================
-- KURULUM TAMAMLANDI
-- ============================================================================
-- Bu betiği Supabase SQL Editor üzerinden tek seferde çalıştırabilirsiniz.
-- Sonraki adım: .env.local dosyanıza NEXT_PUBLIC_SUPABASE_URL ve
-- NEXT_PUBLIC_SUPABASE_ANON_KEY değerlerini ekleyin.
-- ============================================================================
