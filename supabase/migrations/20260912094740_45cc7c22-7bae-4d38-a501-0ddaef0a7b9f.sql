-- Abschlusssicherung für Übersetzungsläufe (idempotent, additiv).
-- 1) Ein Lauf darf nur „abgeschlossen“ werden, wenn Plan und Bilanz passen
--    oder nachweislich keine offenen Einheiten mehr existieren.
-- 2) Bleiben offene Einheiten, bleibt der Lauf weiterlaufbar (Cursor wird
--    zurückgesetzt, damit übersprungene Einheiten erneut geprüft werden).
-- 3) Plananpassung wird im Lauf nachvollziehbar protokolliert.
-- Es werden keine Inhalte, Zieltexte oder Freigaben verändert.

CREATE OR REPLACE FUNCTION public.rpc_internal_translation_open_units(p_run_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_run public.cms_translation_runs;
  v_open integer := 0;
BEGIN
  SELECT * INTO v_run FROM public.cms_translation_runs WHERE id = p_run_id;
  IF v_run.id IS NULL THEN
    RETURN 0;
  END IF;

  IF v_run.scope_kind = 'auto' THEN
    SELECT count(*) INTO v_open
      FROM public.cms_translation_jobs j
     WHERE j.batch_id = 'auto'
       AND j.target_locale = v_run.target_locale
       AND j.status = 'pending';
    RETURN coalesce(v_open, 0);
  END IF;

  SELECT count(*) INTO v_open
    FROM public.cms_translation_units(
           v_run.target_locale,
           CASE WHEN v_run.scope_kind = 'pages'
                  AND coalesce(array_length(v_run.page_keys, 1), 0) > 0
                THEN v_run.page_keys ELSE NULL END,
           NULL
         ) u
   WHERE u.is_todo;

  RETURN coalesce(v_open, 0);
END;
$function$;

REVOKE ALL ON FUNCTION public.rpc_internal_translation_open_units(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_open_units(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_open_units(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_translation_open_units(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.rpc_internal_translation_progress(
  p_run_id uuid,
  p_done integer,
  p_skipped integer,
  p_failed integer,
  p_model_calls integer,
  p_memory_hits integer,
  p_chars integer,
  p_cost numeric,
  p_cursor_page_key text,
  p_cursor_section_key text,
  p_cursor_field_key text,
  p_status text,
  p_error text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_run public.cms_translation_runs;
  v_before public.cms_translation_runs;
  v_status text := p_status;
  v_error text := p_error;
  v_open integer := 0;
  v_processed integer := 0;
  v_reset_cursor boolean := false;
  v_reconciled integer := 0;
BEGIN
  IF p_status IS NOT NULL
     AND p_status <> ALL (ARRAY['queued','running','paused','cancelled','done','error']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'status_invalid');
  END IF;

  SELECT * INTO v_before FROM public.cms_translation_runs WHERE id = p_run_id;
  IF v_before.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'run_not_found');
  END IF;

  -- Abschluss nur bei erfüllter Bilanz oder nachweislich leerer Restmenge.
  IF v_status = 'done' THEN
    v_processed := greatest(coalesce(v_before.fields_done, 0) + greatest(coalesce(p_done, 0), 0), 0)
                 + greatest(coalesce(v_before.fields_skipped, 0) + greatest(coalesce(p_skipped, 0), 0), 0)
                 + greatest(coalesce(v_before.fields_failed, 0) + greatest(coalesce(p_failed, 0), 0), 0);
    v_open := public.rpc_internal_translation_open_units(p_run_id);

    IF v_open > 0 THEN
      -- Es gibt noch etwas zu tun: Lauf bleibt offen und beginnt die Suche
      -- erneut von vorn, damit nichts hinter dem Cursor liegen bleibt.
      IF coalesce(v_before.cursor_page_key, '') = ''
         AND coalesce(p_done, 0) + coalesce(p_skipped, 0) + coalesce(p_failed, 0) = 0 THEN
        -- Vollständiger Durchlauf ohne Fortschritt: sauber beenden, mit Grund.
        v_status := 'done';
        v_error := 'incomplete_unresolved_units:' || v_open;
      ELSE
        v_status := 'running';
        v_reset_cursor := true;
        v_error := 'rescan_open_units:' || v_open;
      END IF;
    ELSIF v_processed < coalesce(v_before.fields_planned, 0) THEN
      -- Nichts mehr offen, aber Plan und Bilanz weichen ab: Plan angleichen
      -- und den Grund im Lauf protokollieren.
      v_reconciled := coalesce(v_before.fields_planned, 0) - v_processed;
    END IF;
  END IF;

  UPDATE public.cms_translation_runs r
     SET fields_done = r.fields_done + greatest(coalesce(p_done, 0), 0),
         fields_skipped = r.fields_skipped + greatest(coalesce(p_skipped, 0), 0),
         fields_failed = r.fields_failed + greatest(coalesce(p_failed, 0), 0),
         batches_done = r.batches_done + CASE WHEN coalesce(p_done, 0) + coalesce(p_skipped, 0) + coalesce(p_failed, 0) > 0 THEN 1 ELSE 0 END,
         model_calls = r.model_calls + greatest(coalesce(p_model_calls, 0), 0),
         memory_hits = r.memory_hits + greatest(coalesce(p_memory_hits, 0), 0),
         chars_source = r.chars_source + greatest(coalesce(p_chars, 0), 0),
         cost_estimate = r.cost_estimate + greatest(coalesce(p_cost, 0), 0),
         cursor_page_key = CASE WHEN v_reset_cursor THEN NULL ELSE coalesce(p_cursor_page_key, r.cursor_page_key) END,
         cursor_section_key = CASE WHEN v_reset_cursor THEN NULL ELSE coalesce(p_cursor_section_key, r.cursor_section_key) END,
         cursor_field_key = CASE WHEN v_reset_cursor THEN NULL ELSE coalesce(p_cursor_field_key, r.cursor_field_key) END,
         fields_planned = CASE WHEN v_reconciled > 0
                               THEN greatest(v_processed, 0)
                               ELSE r.fields_planned END,
         status = coalesce(v_status, r.status),
         last_error = CASE
                        WHEN v_reconciled > 0
                          THEN 'plan_reconciled:' || v_reconciled || ' (bereits vorhandene Zieltexte, nichts mehr offen)'
                        ELSE coalesce(v_error, r.last_error)
                      END,
         finished_at = CASE WHEN coalesce(v_status, r.status) IN ('done','cancelled','error')
                            THEN now() ELSE NULL END
   WHERE r.id = p_run_id
  RETURNING * INTO v_run;

  RETURN jsonb_build_object(
    'success', true,
    'run', to_jsonb(v_run),
    'open_units', v_open,
    'plan_reconciled', v_reconciled,
    'rescan', v_reset_cursor
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.rpc_internal_translation_progress(uuid,integer,integer,integer,integer,integer,integer,numeric,text,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_progress(uuid,integer,integer,integer,integer,integer,integer,numeric,text,text,text,text,text) FROM anon;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_progress(uuid,integer,integer,integer,integer,integer,integer,numeric,text,text,text,text,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_translation_progress(uuid,integer,integer,integer,integer,integer,integer,numeric,text,text,text,text,text) TO service_role;

-- Restlauf fortsetzen: setzt einen (auch fälschlich abgeschlossenen) Lauf
-- zurück auf „läuft“ und beginnt die Suche von vorn. Zieltexte bleiben
-- unangetastet; bereits vorhandene Texte werden nicht erneut übersetzt.
CREATE OR REPLACE FUNCTION public.rpc_internal_translation_run_resume(p_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_run public.cms_translation_runs;
  v_open integer;
BEGIN
  SELECT * INTO v_run FROM public.cms_translation_runs WHERE id = p_run_id;
  IF v_run.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'run_not_found');
  END IF;
  IF v_run.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'run_cancelled');
  END IF;

  v_open := public.rpc_internal_translation_open_units(p_run_id);
  IF v_open = 0 THEN
    UPDATE public.cms_translation_runs r
       SET status = 'done',
           finished_at = coalesce(r.finished_at, now()),
           fields_planned = greatest(r.fields_done + r.fields_skipped + r.fields_failed, 0),
           last_error = 'nothing_open_on_resume'
     WHERE r.id = p_run_id
    RETURNING * INTO v_run;
    RETURN jsonb_build_object('success', true, 'run', to_jsonb(v_run), 'open_units', 0);
  END IF;

  UPDATE public.cms_translation_runs r
     SET status = 'running',
         finished_at = NULL,
         cursor_page_key = NULL,
         cursor_section_key = NULL,
         cursor_field_key = NULL,
         fields_planned = greatest(r.fields_done + r.fields_skipped + r.fields_failed + v_open, 0),
         last_error = 'resumed_open_units:' || v_open
   WHERE r.id = p_run_id
  RETURNING * INTO v_run;

  RETURN jsonb_build_object('success', true, 'run', to_jsonb(v_run), 'open_units', v_open);
END;
$function$;

REVOKE ALL ON FUNCTION public.rpc_internal_translation_run_resume(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_run_resume(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_run_resume(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_translation_run_resume(uuid) TO service_role;