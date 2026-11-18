-- EGG test database only. Run after egg_engine_tables and invitation/member tables.
-- Serializes invitation acceptance and revocation by locking the same project row.
create or replace function public.egg_accept_invite_atomic(p_hash text,p_user uuid,p_email text)
returns table(project_id uuid,member_role text)
language plpgsql security invoker set search_path=''
as $$
declare v_inv public.egg_project_invites%rowtype; v_project uuid;
begin
 select i.project_id into v_project from public.egg_project_invites i where i.token_hash=p_hash;
 if v_project is null then return; end if;
 perform 1 from public.egg_engine_projects p where p.id=v_project for update;
 select * into v_inv from public.egg_project_invites i where i.token_hash=p_hash for update;
 if not found or v_inv.revoked_at is not null or v_inv.accepted_at is not null or v_inv.expires_at<=now() or lower(v_inv.invited_email)<>lower(p_email) then return; end if;
 insert into public.egg_project_members(project_id,user_id,role,spheres)
 values(v_inv.project_id,p_user,v_inv.role,v_inv.spheres)
 on conflict(project_id,user_id) do update set role=excluded.role,spheres=excluded.spheres;
 update public.egg_project_invites set accepted_by=p_user,accepted_at=now() where id=v_inv.id;
 return query select v_inv.project_id,v_inv.role;
end;$$;
revoke all on function public.egg_accept_invite_atomic(text,uuid,text) from public,anon,authenticated;
grant execute on function public.egg_accept_invite_atomic(text,uuid,text) to service_role;

create or replace function public.egg_revoke_member_atomic(p_project uuid,p_member uuid,p_email text)
returns boolean language plpgsql security invoker set search_path=''
as $$
declare v_deleted uuid;
begin
 perform 1 from public.egg_engine_projects p where p.id=p_project for update;
 update public.egg_project_invites set revoked_at=now()
 where project_id=p_project and lower(invited_email)=lower(p_email) and revoked_at is null and accepted_at is null;
 delete from public.egg_project_members where project_id=p_project and user_id=p_member returning user_id into v_deleted;
 return v_deleted is not null;
end;$$;
revoke all on function public.egg_revoke_member_atomic(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.egg_revoke_member_atomic(uuid,uuid,text) to service_role;
