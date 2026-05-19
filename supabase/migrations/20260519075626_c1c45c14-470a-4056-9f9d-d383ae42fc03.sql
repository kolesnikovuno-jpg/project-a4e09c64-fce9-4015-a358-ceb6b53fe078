
DO $$
DECLARE
  v_id uuid := '00000000-0000-4000-8000-000000000603';
  v_before bigint;
  v_after_first bigint;
  v_after_second bigint;
BEGIN
  DELETE FROM public.submissions WHERE id = v_id;
  INSERT INTO public.submissions (id, email, situation, uncertainty, scope, status, payment_email_sent, payment_confirmation_sent)
  VALUES (v_id, 'validation@example.com', 's', 'u', 'sc', 'accepted', true, false);

  SELECT count(*) INTO v_before FROM net._http_response WHERE created > now() - interval '5 minutes';

  UPDATE public.submissions SET status = 'paid' WHERE id = v_id;
  PERFORM pg_sleep(2);
  SELECT count(*) INTO v_after_first FROM net._http_response WHERE created > now() - interval '5 minutes';

  -- second update with status already 'paid' must NOT fire
  UPDATE public.submissions SET status = 'paid' WHERE id = v_id;
  PERFORM pg_sleep(2);
  SELECT count(*) INTO v_after_second FROM net._http_response WHERE created > now() - interval '5 minutes';

  RAISE NOTICE 'before=% after_first=% after_second=% pcs=%',
    v_before, v_after_first, v_after_second,
    (SELECT payment_confirmation_sent FROM public.submissions WHERE id = v_id);

  DELETE FROM public.submissions WHERE id = v_id;
END $$;
