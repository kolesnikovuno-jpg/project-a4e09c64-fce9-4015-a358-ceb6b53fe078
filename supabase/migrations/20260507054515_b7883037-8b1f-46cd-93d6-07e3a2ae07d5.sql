DROP POLICY "Anyone can submit participation request" ON public.participation_requests;
CREATE POLICY "Anyone can submit participation request"
ON public.participation_requests
FOR INSERT
WITH CHECK (
  (length(TRIM(BOTH FROM name)) > 0)
  AND (length(name) <= 100)
  AND (length(TRIM(BOTH FROM email)) > 0)
  AND (length(email) <= 255)
  AND (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text)
  AND ((message IS NULL) OR (length(message) <= 2000))
  AND (model = ANY (ARRAY['lyra'::text, 'nava'::text, 'void'::text]))
  AND ((sentiment IS NULL) OR (sentiment = ANY (ARRAY['support'::text, 'participation'::text, 'undecided'::text, 'material'::text])))
);