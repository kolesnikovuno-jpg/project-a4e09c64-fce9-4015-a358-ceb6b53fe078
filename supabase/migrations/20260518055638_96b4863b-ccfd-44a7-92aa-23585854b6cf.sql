
insert into storage.buckets (id, name, public)
values ('case-pdfs', 'case-pdfs', false)
on conflict (id) do nothing;

create policy "Admins can read case pdfs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'case-pdfs'
  and public.has_role(auth.uid(), 'admin'::public.app_role)
);

create policy "Service role manages case pdfs"
on storage.objects
for all
to public
using (bucket_id = 'case-pdfs' and auth.role() = 'service_role')
with check (bucket_id = 'case-pdfs' and auth.role() = 'service_role');
