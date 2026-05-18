-- Revoke EXECUTE from public/anon/authenticated on SECURITY DEFINER functions
-- that should only be called by triggers or service-role edge functions.

REVOKE EXECUTE ON FUNCTION public.notify_payment_confirmation_webhook() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_payment_webhook_on_accept() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_case_on_paid() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

-- has_role() is intentionally left executable: RLS policies that target the
-- authenticated role call it with caller privileges, so EXECUTE must remain
-- granted to authenticated. It only checks role membership and reveals nothing
-- beyond what the caller already implicitly knows.