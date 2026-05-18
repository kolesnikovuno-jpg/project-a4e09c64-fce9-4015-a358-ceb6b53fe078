ALTER TABLE public.cases
ADD COLUMN delivery_email_sent BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.cases.delivery_email_sent IS 'Flag indicating whether the final delivery email has been sent to the client.';