-- 10_device_api_keys.sql

CREATE TABLE IF NOT EXISTS public.tenant_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    device_type TEXT NOT NULL DEFAULT 'kiosk',
    key_hash TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- RLS
ALTER TABLE public.tenant_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can view their api keys"
    ON public.tenant_api_keys
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Tenant admins can insert their api keys"
    ON public.tenant_api_keys
    FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Tenant admins can update their api keys"
    ON public.tenant_api_keys
    FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Tenant admins can delete their api keys"
    ON public.tenant_api_keys
    FOR DELETE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
        )
    );
