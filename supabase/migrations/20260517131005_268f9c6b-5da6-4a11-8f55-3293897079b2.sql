
CREATE TABLE public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language text,
  situation text NOT NULL,
  uncertainty text NOT NULL,
  scope text NOT NULL,
  supporting_links text,
  name text,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit clarity request"
ON public.submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(trim(situation)) > 0 AND length(situation) <= 5000
  AND length(trim(uncertainty)) > 0 AND length(uncertainty) <= 5000
  AND length(trim(scope)) > 0 AND length(scope) <= 5000
  AND (supporting_links IS NULL OR length(supporting_links) <= 3000)
  AND (name IS NULL OR length(name) <= 200)
  AND length(trim(email)) > 0 AND length(email) <= 320
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND status = 'new'
  AND (language IS NULL OR language = ANY (ARRAY['en','ru','uk']))
);
