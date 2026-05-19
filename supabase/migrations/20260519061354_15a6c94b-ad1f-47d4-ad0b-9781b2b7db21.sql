CREATE OR REPLACE FUNCTION public.notify_payment_confirmation_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM 'paid'
     AND NEW.status = 'paid'
     AND COALESCE(NEW.payment_confirmation_sent, false) = false
  THEN
    PERFORM net.http_post(
      url := 'https://hook.eu2.make.com/upn69k6yv7sj9w6o9298nd04t7b14vsn',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'id', NEW.id,
        'email', NEW.email,
        'name', NEW.name,
        'language', NEW.language,
        'status', NEW.status
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_payment_confirmation_webhook ON public.submissions;

CREATE TRIGGER trg_notify_payment_confirmation_webhook
BEFORE UPDATE OF status ON public.submissions
FOR EACH ROW
WHEN (
  OLD.status IS DISTINCT FROM 'paid'
  AND NEW.status = 'paid'
  AND COALESCE(NEW.payment_confirmation_sent, false) = false
)
EXECUTE FUNCTION public.notify_payment_confirmation_webhook();

DROP TRIGGER IF EXISTS submissions_payment_webhook_trigger ON public.submissions;