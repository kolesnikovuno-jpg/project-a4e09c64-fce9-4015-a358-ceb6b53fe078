
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.notify_payment_webhook_on_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.status = 'accepted'
     AND COALESCE(NEW.payment_email_sent, false) = false
     AND (OLD.status IS DISTINCT FROM NEW.status
          OR COALESCE(OLD.payment_email_sent, false) = false)
  THEN
    PERFORM net.http_post(
      url := 'https://hook.eu2.make.com/uxlhnlt4uo3fswylh38xmx6sv7y28h1c',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'id', NEW.id,
        'email', NEW.email,
        'name', NEW.name,
        'language', NEW.language,
        'status', NEW.status
      )
    );

    NEW.payment_email_sent := true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_payment_on_accept ON public.submissions;
DROP TRIGGER IF EXISTS trg_notify_payment_webhook_on_accept ON public.submissions;

CREATE TRIGGER trg_notify_payment_webhook_on_accept
BEFORE UPDATE ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.notify_payment_webhook_on_accept();
