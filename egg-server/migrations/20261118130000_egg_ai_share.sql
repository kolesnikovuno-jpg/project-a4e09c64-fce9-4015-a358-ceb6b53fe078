-- Applied to isolated egg-engine-test Supabase; retain for reproducibility.
alter table public.egg_sphere_settings add column if not exists ai_share smallint not null default 50 check(ai_share between 0 and 100 and ai_share % 5 = 0);
