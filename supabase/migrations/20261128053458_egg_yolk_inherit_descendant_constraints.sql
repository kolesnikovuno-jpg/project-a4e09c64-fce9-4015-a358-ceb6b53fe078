CREATE OR REPLACE VIEW public.egg_yolk_synthesis_v1 WITH (security_invoker=true) AS  SELECT n.id AS node_id,
    n.root_passport_id,
    n.parent_id,
    n.title,
    n.level,
    n.status,
        CASE
            WHEN n.parent_id IS NULL AND op.id IS NOT NULL THEN jsonb_build_object('metric', op.goal_metric, 'target', op.goal_target, 'revision', op.goal_revision, 'actual', NULL::unknown, 'actual_status', 'not_verified')
            ELSE jsonb_build_object('description', NULLIF(n.goal, ''::text))
        END AS goal,
    COALESCE(s.results, '[]'::jsonb) AS sphere_matrix,
    COALESCE(s.covered, 0::bigint) AS covered_spheres,
    COALESCE(s.verified, 0::bigint) AS verified_spheres,
    COALESCE(g.gaps, '[]'::jsonb) AS information_gaps,
    COALESCE(g.critical, 0::bigint) AS critical_gaps,
    COALESCE(c.children, '[]'::jsonb) AS child_states,
    COALESCE(t.tasks, '[]'::jsonb) AS next_tasks,
    y.child_handoffs,
        CASE
            WHEN g.critical > 0 THEN 'evidence_blocked'::text
            WHEN t.tasks IS NOT NULL THEN 'work_pending'::text
            WHEN COALESCE(s.covered, 0::bigint) < 8 THEN 'incomplete'::text
            ELSE 'review_required'::text
        END AS synthesis_state,
    'not_evaluated'::text AS semantic_conflict_status,
        CASE
            WHEN g.critical > 0 THEN 'resolve_critical_evidence'::text
            WHEN t.tasks IS NOT NULL THEN 'review_pending_tasks'::text
            WHEN COALESCE(s.covered, 0::bigint) < 8 THEN 'review_missing_spheres'::text
            ELSE 'review_synthesis'::text
        END AS next_iteration,
        CASE
            WHEN n.parent_id IS NULL AND op.id IS NOT NULL THEN jsonb_build_object('scope', 'operational_project', 'ai_budget_scope', 'owner', 'ai_budget_daily_usd', b.daily_usd, 'ai_budget_30d_usd', b.rolling_30d_usd, 'ai_committed_daily_usd', b.daily_committed_usd, 'ai_committed_30d_usd', b.rolling_committed_usd, 'project_actual_tokens', u.tokens, 'measured_runs', u.measured, 'project_actual_cost_usd', u.cost, 'ads_daily_limit_uah', op.ads_daily_limit_uah, 'ads_30d_limit_uah', op.ads_rolling_30d_limit_uah)
            ELSE NULL::jsonb
        END AS resources
   FROM egg_object_nodes n
     JOIN egg_passport_registry r ON r.id = n.root_passport_id
     JOIN egg_object_yolk_state y ON y.node_id = n.id
     LEFT JOIN egg_operational_projects op ON r.source_kind = 'operational'::text AND op.id = r.source_project_id
     LEFT JOIN egg_ai_budget_state b ON b.owner_id = r.owner_id
     LEFT JOIN LATERAL ( SELECT jsonb_agg(jsonb_build_object('sphere', v.sphere, 'status', COALESCE(x.result ->> 'status'::text,
                CASE
                    WHEN x.id IS NULL THEN 'missing'::text
                    ELSE 'unclassified'::text
                END), 'result_id', x.id, 'iteration', x.iteration, 'observation', (x.result -> 'finding'::text) ->> 'observation'::text, 'hypothesis', (x.result -> 'finding'::text) ->> 'hypothesis'::text, 'next_step', (x.result -> 'finding'::text) ->> 'nextStep'::text, 'evidence_status', x.result ->> 'evidence_status'::text) ORDER BY v.ord) AS results,
            count(x.id) AS covered,
            count(*) FILTER (WHERE (x.result ->> 'status'::text) = 'verified'::text) AS verified
           FROM unnest(ARRAY['marketing'::text, 'design'::text, 'testDrive'::text, 'commerce'::text, 'law'::text, 'production'::text, 'assembly'::text, 'retail'::text]) WITH ORDINALITY v(sphere, ord)
             LEFT JOIN LATERAL ( SELECT a.id,
                    a.iteration,
                    a.result
                   FROM egg_object_sphere_results a
                  WHERE a.node_id = n.id AND a.level = n.level AND a.sphere = v.sphere
                  ORDER BY a.iteration DESC, a.created_at DESC
                 LIMIT 1) x ON true) s ON true
     LEFT JOIN LATERAL ( SELECT jsonb_agg(jsonb_build_object('gap_id', i.id, 'node_id', l.node_id, 'sphere', a.sphere, 'priority', i.priority, 'source_type', i.source_type, 'status', i.status, 'detail', i.detail) ORDER BY (
                CASE i.priority
                    WHEN 'critical'::text THEN 0
                    WHEN 'important'::text THEN 1
                    ELSE 2
                END), i.created_at, i.id) AS gaps,
            count(*) FILTER (WHERE i.priority = 'critical'::text) AS critical
           FROM egg_operational_information_gaps i
             JOIN egg_object_activation_links l ON l.activation_id = i.source_activation_id
             JOIN egg_operational_activations a ON a.id = l.activation_id
             JOIN egg_object_nodes child ON child.id = l.node_id
          WHERE l.node_id IN (WITH RECURSIVE subtree(id) AS (SELECT n.id UNION ALL SELECT d.id FROM public.egg_object_nodes d JOIN subtree st ON d.parent_id=st.id WHERE d.root_passport_id=n.root_passport_id) SELECT id FROM subtree) AND l.level = child.level AND (i.status <> ALL (ARRAY['resolved'::text, 'superseded'::text]))) g ON true
     LEFT JOIN LATERAL ( SELECT jsonb_agg(jsonb_build_object('node_id', w.node_id, 'title', w.title, 'level', w.level, 'status', w.status, 'pending', w.pending, 'proposed', w.proposed, 'verified', w.verified, 'blocked', w.blocked) ORDER BY w.title, w.node_id) AS children
           FROM egg_object_work_state w
          WHERE w.parent_id = n.id) c ON true
     LEFT JOIN LATERAL ( SELECT jsonb_agg(jsonb_build_object('activation_id', a.id, 'node_id', l.node_id, 'sphere', a.sphere, 'task', a.task, 'status', a.status) ORDER BY (
                CASE a.status
                    WHEN 'researching'::text THEN 0
                    WHEN 'pending'::text THEN 1
                    ELSE 2
                END), a.created_at, a.id) AS tasks
           FROM egg_operational_activations a
             JOIN egg_object_activation_links l ON l.activation_id = a.id
             JOIN egg_object_nodes child ON child.id = l.node_id
          WHERE l.node_id IN (WITH RECURSIVE subtree(id) AS (SELECT n.id UNION ALL SELECT d.id FROM public.egg_object_nodes d JOIN subtree st ON d.parent_id=st.id WHERE d.root_passport_id=n.root_passport_id) SELECT id FROM subtree) AND l.level = child.level AND (a.status = ANY (ARRAY['pending'::text, 'researching'::text, 'blocked'::text]))) t ON true
     LEFT JOIN LATERAL ( SELECT sum(ar.total_tokens) AS tokens,
            count(ar.total_tokens) AS measured,
            sum(rr.actual_usd) FILTER (WHERE rr.state = 'settled'::text) AS cost
           FROM egg_operational_auto_runs ar
             LEFT JOIN egg_ai_reservations rr ON rr.run_id = ar.id
          WHERE ar.operational_project_id = op.id) u ON true;
