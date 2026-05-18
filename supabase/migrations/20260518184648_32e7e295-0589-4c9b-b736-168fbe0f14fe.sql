-- has_role() is only consulted by RLS policies that target authenticated users.
-- Anonymous callers never need to execute it directly.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;