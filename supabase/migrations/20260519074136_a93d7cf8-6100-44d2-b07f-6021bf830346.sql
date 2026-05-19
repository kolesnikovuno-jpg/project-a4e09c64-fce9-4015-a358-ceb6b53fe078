CREATE TABLE IF NOT EXISTS public.payment_confirmation_webhook_deliveries (
  submission_id uuid PRIMARY KEY,
  webhook_request_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_confirmation_webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage payment confirmation deliveries"
ON public.payment_confirmation_webhook_deliveries;

CREATE POLICY "Service role can manage payment confirmation deliveries"
ON public.payment_confirmation_webhook_deliveries
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.notify_payment_confirmation_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  inserted_submission_id uuid;
  request_id bigint;
BEGIN
  IF OLD.status IS DISTINCT FROM 'paid'
     AND NEW.status = 'paid'
  THEN
    INSERT INTO public.payment_confirmation_webhook_deliveries (submission_id)
    VALUES (NEW.id)
    ON CONFLICT (submission_id) DO NOTHING
    RETURNING submission_id INTO inserted_submission_id;

    IF inserted_submission_id IS NOT NULL THEN
      SELECT net.http_post(
        url := 'https://hook.eu2.make.com/upn69k6yv7sj9w6o9298nd04t7b14vsn',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object(
          'id', NEW.id,
          'email', NEW.email,
          'name', NEW.name,
          'language', NEW.language,
          'status', NEW.status
        )
      ) INTO request_id;

      UPDATE public.payment_confirmation_webhook_deliveries
      SET webhook_request_id = request_id
      WHERE submission_id = NEW.id;
    END IF;

    NEW.payment_confirmation_sent := true;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_payment_confirmation_webhook ON public.submissions;

CREATE TRIGGER trg_notify_payment_confirmation_webhook
BEFORE UPDATE OF status ON public.submissions
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM 'paid'::text AND NEW.status = 'paid'::text)
EXECUTE FUNCTION public.notify_payment_confirmation_webhook();