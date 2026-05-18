-- Prevent duplicate case creation for the same submission
CREATE UNIQUE INDEX IF NOT EXISTS cases_submission_id_unique
  ON public.cases(submission_id);

-- Function: create a case when a submission transitions to paid
CREATE OR REPLACE FUNCTION public.create_case_on_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid'
     AND (OLD.status IS DISTINCT FROM NEW.status)
  THEN
    INSERT INTO public.cases (
      submission_id,
      client_name,
      email,
      language,
      service_status,
      raw_input,
      ai_draft,
      working_notes,
      final_output,
      pdf_url
    ) VALUES (
      NEW.id,
      NEW.name,
      NEW.email,
      NEW.language,
      'queued',
      'Situation:' || E'\n' || COALESCE(NEW.situation, '') || E'\n\n' ||
      'Uncertainty:' || E'\n' || COALESCE(NEW.uncertainty, '') || E'\n\n' ||
      'Scope:' || E'\n' || COALESCE(NEW.scope, '') || E'\n\n' ||
      'Supporting links:' || E'\n' || COALESCE(NEW.supporting_links, ''),
      '',
      '',
      '',
      ''
    )
    ON CONFLICT (submission_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_case_on_paid ON public.submissions;
CREATE TRIGGER trg_create_case_on_paid
AFTER UPDATE ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.create_case_on_paid();