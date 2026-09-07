-- 06_auth_profiles_trigger.sql
-- Auth user -> profile senkronizasyonu ve profil RLS iyileştirmeleri

-- auth.users ile public.profiles arasında tutarlı ilişki
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_user_id_fkey'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
  END IF;
END
$$;

-- RLS recursion riskini kaldırmak için SECURITY DEFINER helper
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = p_user_id
      AND role = 'super_admin'
  );
$$;

DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile or super admins view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Yeni auth kullanıcılarından profil üret
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, role, display_name, avatar_url)
  VALUES (
    NEW.id,
    CASE
      WHEN COALESCE(NEW.raw_user_meta_data ->> 'role', '') = 'super_admin' THEN 'super_admin'
      ELSE 'tenant_admin'
    END,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- Mevcut auth kullanıcıları için profile backfill
INSERT INTO public.profiles (user_id, role, display_name, avatar_url)
SELECT
  u.id,
  CASE
    WHEN COALESCE(u.raw_user_meta_data ->> 'role', '') = 'super_admin' THEN 'super_admin'
    ELSE 'tenant_admin'
  END,
  COALESCE(u.raw_user_meta_data ->> 'full_name', u.email),
  u.raw_user_meta_data ->> 'avatar_url'
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;
