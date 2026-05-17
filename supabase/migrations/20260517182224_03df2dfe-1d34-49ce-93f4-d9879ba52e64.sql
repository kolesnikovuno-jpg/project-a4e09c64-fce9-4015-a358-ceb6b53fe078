
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
    PERFORM extensions.http_post(
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

DROP TRIGGER IF EXISTS submissions_payment_webhook_trigger ON public.submissions;

CREATE TRIGGER submissions_payment_webhook_trigger
BEFORE UPDATE ON public.submissions
FOR EACH ROW
WHEN (NEW.status = 'accepted' AND COALESCE(NEW.payment_email_sent, false) = false)
EXECUTE FUNCTION public.notify_payment_webhook_on_accept();
