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

    NEW.payment_confirmation_sent := true;
  END IF;

  RETURN NEW;
END;
$function$;