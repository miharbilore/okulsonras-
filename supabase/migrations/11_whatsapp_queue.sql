-- 11_whatsapp_queue.sql

CREATE TYPE public.queue_status AS ENUM ('pending', 'processing', 'sent', 'failed');

CREATE TABLE IF NOT EXISTS public.whatsapp_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    phone TEXT NOT NULL,
    message TEXT NOT NULL,
    status public.queue_status NOT NULL DEFAULT 'pending',
    error_msg TEXT,
    attempts INT NOT NULL DEFAULT 0,
    scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- İndeksler (Queue processing için sorgu performansını artırır)
CREATE INDEX idx_whatsapp_queue_status_scheduled ON public.whatsapp_queue(status, scheduled_for);
CREATE INDEX idx_whatsapp_queue_tenant ON public.whatsapp_queue(tenant_id);

-- RLS (Row Level Security)
ALTER TABLE public.whatsapp_queue ENABLE ROW LEVEL SECURITY;

-- Tenant adminler sadece kendi tenantlarına ait kuyruğu görebilir
CREATE POLICY "Tenant admins can view their queue"
    ON public.whatsapp_queue
    FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Tenant admins can insert to their queue"
    ON public.whatsapp_queue
    FOR INSERT
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
