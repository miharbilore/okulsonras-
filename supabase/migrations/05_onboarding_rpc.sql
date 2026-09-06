
-- =============================================
-- ONBOARDING RPC: Yeni bir tenant ve profil olusturur
-- SECURITY DEFINER kullanilarak RLS bypass edilir (Admin yetkisiyle calisir)
-- =============================================

CREATE OR REPLACE FUNCTION public.create_tenant_and_profile(
    p_tenant_name TEXT,
    p_tenant_slug TEXT,
    p_user_id UUID,
    p_display_name TEXT,
    p_avatar_url TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Run as DB admin to bypass RLS for inserting new tenant
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_profile_id UUID;
    v_existing_profile_id UUID;
    v_existing_tenant_id UUID;
BEGIN
    -- Kullanicinin zaten profili var mi kontrol et
    SELECT id, tenant_id INTO v_existing_profile_id, v_existing_tenant_id 
    FROM public.profiles WHERE user_id = p_user_id;

    -- Eger profili varsa ve bir tenant'a bagliysa islem yapma, tenant'i dondur
    IF v_existing_profile_id IS NOT NULL AND v_existing_tenant_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'tenant_id', v_existing_tenant_id,
            'profile_id', v_existing_profile_id
        );
    END IF;

    -- Yeni tenant olustur
    INSERT INTO public.tenants (name, slug)
    VALUES (p_tenant_name, p_tenant_slug)
    RETURNING id INTO v_tenant_id;

    -- Eger profil yoksa yeni olustur
    IF v_existing_profile_id IS NULL THEN
        INSERT INTO public.profiles (user_id, role, tenant_id, display_name, avatar_url)
        VALUES (p_user_id, 'tenant_admin', v_tenant_id, p_display_name, p_avatar_url)
        RETURNING id INTO v_profile_id;
    ELSE
        -- Eger profil varsa ama tenant_id null ise guncelle
        UPDATE public.profiles 
        SET tenant_id = v_tenant_id
        WHERE id = v_existing_profile_id
        RETURNING id INTO v_profile_id;
    END IF;

    -- JWT claim (app_metadata.tenant_id) guncellemesi (RLS'in calismasi icin zorunlu)
    UPDATE auth.users 
    SET raw_app_meta_data = jsonb_set(
        COALESCE(raw_app_meta_data, '{}'::jsonb), 
        '{tenant_id}', 
        to_jsonb(v_tenant_id)
    )
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'tenant_id', v_tenant_id,
        'profile_id', v_profile_id
    );
END;
$$;
