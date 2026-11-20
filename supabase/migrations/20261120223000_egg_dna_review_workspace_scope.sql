-- Keep Author's DNA editor separately in the owner-RLS workspace.
-- A reviewed draft is not the approved EggProject.seed; no auto-approval.
ALTER TABLE public.egg_workspace_snapshots
 DROP CONSTRAINT egg_workspace_snapshots_scope_check;
ALTER TABLE public.egg_workspace_snapshots
 ADD CONSTRAINT egg_workspace_snapshots_scope_check
 CHECK (scope IN ('idea','field','matter','research','exterior','dna'));
