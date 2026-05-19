REVOKE EXECUTE ON FUNCTION public.notify_payment_confirmation_webhook() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_payment_confirmation_webhook() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_payment_confirmation_webhook() FROM authenticated;