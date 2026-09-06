-- 02_notifications.sql

-- Bildirim Kuyruğu (Notification Queue) Tablosu
CREATE TABLE public.daily_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('daily_spending', 'weekly_report', 'check_in')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Aktifleştir
ALTER TABLE public.daily_notifications ENABLE ROW LEVEL SECURITY;

-- Tenant İzolasyonu RLS Policy
CREATE POLICY "Tenants can manage their own notifications" ON public.daily_notifications
    FOR ALL
    USING (tenant_id = public.current_tenant_id())
    WITH CHECK (tenant_id = public.current_tenant_id());

-- Performans için Index
CREATE INDEX idx_notifications_tenant_status ON public.daily_notifications(tenant_id, status);
