ALTER TABLE public.participation_requests
  ADD COLUMN IF NOT EXISTS sentiment text;

-- Recreate the insert policy to include sentiment validation (optional value, must be one of allowed)
DROP POLICY IF EXISTS "Anyone can submit participation request" ON public.participation_requests;

CREATE POLICY "Anyone can submit participation request"
ON public.participation_requests
FOR INSERT
WITH CHECK (
  length(TRIM(BOTH FROM name)) > 0
  AND length(name) <= 100
  AND length(TRIM(BOTH FROM email)) > 0
  AND length(email) <= 255
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (message IS NULL OR length(message) <= 2000)
  AND model = ANY (ARRAY['lyra'::text, 'nava'::text])
  AND (sentiment IS NULL OR sentiment = ANY (ARRAY['support'::text, 'participation'::text, 'undecided'::text]))
);