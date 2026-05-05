DROP POLICY "Anyone can submit participation request" ON public.participation_requests;
CREATE POLICY "Anyone can submit participation request" ON public.participation_requests
FOR INSERT WITH CHECK (
  length(TRIM(BOTH FROM name)) > 0 AND length(name) <= 100
  AND length(TRIM(BOTH FROM email)) > 0 AND length(email) <= 255
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (message IS NULL OR length(message) <= 2000)
  AND model = ANY (ARRAY['lyra','nava'])
  AND (sentiment IS NULL OR sentiment = ANY (ARRAY['support','participation','undecided','material']))
);