CREATE TABLE public.participation_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT,
  locale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.participation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit participation request"
ON public.participation_requests
FOR INSERT
WITH CHECK (
  length(trim(name)) > 0 AND length(name) <= 100
  AND length(trim(email)) > 0 AND length(email) <= 255
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (message IS NULL OR length(message) <= 2000)
  AND model IN ('lyra','nava')
);