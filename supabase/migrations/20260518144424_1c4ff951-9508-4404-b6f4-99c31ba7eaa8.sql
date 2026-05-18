
insert into storage.buckets (id, name, public)
values ('clarity-attachments', 'clarity-attachments', true)
on conflict (id) do nothing;

create policy "Public read clarity attachments"
on storage.objects for select
to public
using (bucket_id = 'clarity-attachments');

create policy "Anyone can upload clarity attachments"
on storage.objects for insert
to public
with check (bucket_id = 'clarity-attachments');
