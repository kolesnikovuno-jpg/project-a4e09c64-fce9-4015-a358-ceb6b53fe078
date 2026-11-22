-- Lyra Supabase project gdsvwiemdggxboxzbdqd ONLY. Do not apply to EGG project.
CREATE OR REPLACE FUNCTION public.lyra_egg_daily_snapshot(p_day date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
with
bounds as (
  select (p_day::timestamp at time zone 'Europe/Kyiv') as start_at,
         ((p_day+1)::timestamp at time zone 'Europe/Kyiv') as end_at
),
web_events as (
  select event_type, source, session_id from public.lyra_interaction_events, bounds
  where created_at>=bounds.start_at and created_at<bounds.end_at
),
leads as (
  select status from public.lyra_inquiries, bounds
  where created_at>=bounds.start_at and created_at<bounds.end_at
),
demand as (
  select event_type from public.lyra_demand_events, bounds
  where created_at>=bounds.start_at and created_at<bounds.end_at
)
select jsonb_build_object(
 'day',to_char(p_day,'YYYY-MM-DD'),
 'timezone','Europe/Kyiv',
 'websiteEvents',(select count(*) from web_events),
 'sessionIdentifiers',(select count(distinct session_id) from web_events),
 'pageViews',(select count(*) from web_events where event_type='page_view'),
 'requestOpens',(select count(*) from web_events where event_type='request_open'),
 'formSuccessEvents',(select count(*) from web_events where event_type='request_success'),
 'infoOpens',(select count(*) from web_events where event_type='info_open'),
 'modelInteractions',(select count(*) from web_events where event_type='model_interact'),
 'sourceCampaignEvents',(select count(*) from web_events where source='campaign'),
 'sourceGoogleEvents',(select count(*) from web_events where source='google'),
 'sourceDirectEvents',(select count(*) from web_events where source='direct'),
 'inquiries',(select count(*) from leads),
 'inquiriesNew',(select count(*) from leads where status='new'),
 'inquiriesClosed',(select count(*) from leads where status='closed'),
 'demandEvents',(select count(*) from demand),
 'confirmedOrders',null
);
$function$
;
revoke all on function public.lyra_egg_daily_snapshot(date) from public,anon,authenticated;
grant execute on function public.lyra_egg_daily_snapshot(date) to service_role;
