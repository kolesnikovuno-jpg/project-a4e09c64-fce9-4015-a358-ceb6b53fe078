-- Grant the Lyra operator role only after Supabase Auth verifies the owner's email.
create or replace function public.grant_lyra_owner_role()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.email = 'kolesnikov.st.io@gmail.com'
     and new.email_confirmed_at is not null then
    insert into public.user_roles(user_id, role) values (new.id, 'admin')
    on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.grant_lyra_owner_role() from public, anon, authenticated;
create trigger grant_lyra_owner_after_auth
after insert or update of email_confirmed_at on auth.users
for each row execute function public.grant_lyra_owner_role();
