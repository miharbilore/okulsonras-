-- 09_fix_profiles_rls_recursion.sql
-- Fixes infinite recursion in RLS by ensuring SECURITY DEFINER is respected
-- changing LANGUAGE sql to LANGUAGE plpgsql prevents query inlining

CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_super BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = p_user_id
      AND role = 'super_admin'
  ) INTO v_is_super;
  
  RETURN v_is_super;
END;
$$;
