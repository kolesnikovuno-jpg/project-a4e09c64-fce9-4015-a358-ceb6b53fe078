DROP TRIGGER IF EXISTS trg_notify_payment_confirmation_webhook ON public.submissions;

CREATE TRIGGER trg_notify_payment_confirmation_webhook
BEFORE UPDATE OF status ON public.submissions
FOR EACH ROW
WHEN (
  OLD.status IS DISTINCT FROM NEW.status
  AND NEW.status = 'paid'
)
EXECUTE FUNCTION public.notify_payment_confirmation_webhook();