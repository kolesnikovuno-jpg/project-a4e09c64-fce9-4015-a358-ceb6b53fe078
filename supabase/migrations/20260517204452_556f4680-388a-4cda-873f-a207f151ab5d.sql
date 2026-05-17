
CREATE OR REPLACE FUNCTION public.notify_payment_confirmation_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NEW.status = 'paid'
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND COALESCE(NEW.payment_confirmation_sent, false) = false
  THEN
    PERFORM net.http_post(
      url := 'https://hook.eu2.make.com/REPLACE_WITH_PAYMENT_CONFIRMATION_WEBHOOK',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'id', NEW.id,
        'email', NEW.email,
        'name', NEW.name,
        'language', NEW.language,
        'status', NEW.status
      )
    );

    NEW.payment_confirmation_sent := true;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_payment_confirmation_webhook ON public.submissions;

CREATE TRIGGER trg_notify_payment_confirmation_webhook
BEFORE UPDATE ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.notify_payment_confirmation_webhook();
