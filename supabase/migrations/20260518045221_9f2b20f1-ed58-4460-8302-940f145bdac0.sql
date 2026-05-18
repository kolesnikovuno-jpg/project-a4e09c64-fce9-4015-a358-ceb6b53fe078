CREATE TABLE public.cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    client_name TEXT,
    email TEXT NOT NULL,
    language TEXT,
    service_status TEXT DEFAULT 'draft',
    raw_input TEXT,
    ai_draft TEXT,
    working_notes TEXT,
    final_output TEXT,
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

-- Internal workspace: service role only
CREATE POLICY "Service role can manage cases"
ON public.cases
FOR ALL
TO public
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_cases_updated_at
BEFORE UPDATE ON public.cases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();