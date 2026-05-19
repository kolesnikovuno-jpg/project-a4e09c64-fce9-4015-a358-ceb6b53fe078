DROP TRIGGER IF EXISTS trg_create_case_on_paid ON public.submissions;

CREATE TRIGGER trg_create_case_on_paid
AFTER UPDATE OF status ON public.submissions
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'paid')
EXECUTE FUNCTION public.create_case_on_paid();