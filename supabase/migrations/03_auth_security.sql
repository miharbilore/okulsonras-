-- 03_auth_security.sql
-- Kullanıcı Profilleri, Terminal Token ve PIN Güvenlik Tabloları

-- =============================================
-- 1. KULLANICI PROFİLLERİ (Rol Yönetimi)
-- =============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'tenant_admin' CHECK (role IN ('super_admin', 'tenant_admin')),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Super admin her şeyi görebilir, tenant_admin sadece kendi profilini
CREATE POLICY "Super admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.user_id = auth.uid() AND p.role = 'super_admin'
        )
    );

CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (user_id = auth.uid());

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_tenant_id ON public.profiles(tenant_id);

-- =============================================
-- 2. TERMINAL TOKEN (Kiosk & POS Cihaz Güvenliği)
-- =============================================
CREATE TABLE public.terminal_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    label TEXT DEFAULT 'Kiosk Terminal',
    terminal_type TEXT NOT NULL DEFAULT 'kiosk' CHECK (terminal_type IN ('kiosk', 'pos')),
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.terminal_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants manage own terminal tokens" ON public.terminal_tokens
    FOR ALL
    USING (tenant_id = public.current_tenant_id())
    WITH CHECK (tenant_id = public.current_tenant_id());

CREATE INDEX idx_terminal_tokens_token ON public.terminal_tokens(token);
CREATE INDEX idx_terminal_tokens_tenant ON public.terminal_tokens(tenant_id);

-- =============================================
-- 3. PIN GİRİŞ DENEMELERİ (Brute-Force Koruması)
-- =============================================
CREATE TABLE public.pin_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    identifier TEXT NOT NULL,  -- IP veya cihaz kimliği
    attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.pin_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants manage own pin attempts" ON public.pin_attempts
    FOR ALL
    USING (tenant_id = public.current_tenant_id())
    WITH CHECK (tenant_id = public.current_tenant_id());

CREATE INDEX idx_pin_attempts_identifier ON public.pin_attempts(tenant_id, identifier);
