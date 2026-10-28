-- lovable-cron-fallback-reviewed: 1440 runs/day; Minutentakt nur während offener Übersetzungsläufe, Zeitplan wird nach Abarbeitung automatisch entfernt (wake-on-enqueue / unschedule-after-drain); langsamerer Takt würde abgebrochene Läufe bis zu 60 Minuten stillstehen lassen.
create extension if not exists pg_cron;
create extension if not exists pg_net;

alter table public.cms_translation_runs
  add column if not exists lease_owner uuid,
  add column if not exists lease_until timestamptz,
  add column if not exists worker_armed boolean not null default false,
  add column if not exists worker_last_seen timestamptz;

create index if not exists cms_translation_runs_worker_idx
  on public.cms_translation_runs (status, lease_until);

create or replace function public.rpc_internal_translation_worker_pending()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'pending', (select count(*) from public.cms_translation_runs where status in ('queued','running')),
    'paused', (select count(*) from public.cms_translation_runs where status = 'paused')
  );
$$;

create or replace function public.rpc_internal_translation_worker_claim(p_lease_seconds integer default 120)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_owner uuid := gen_random_uuid();
  v_run public.cms_translation_runs;
  v_secs int := greatest(30, least(600, coalesce(p_lease_seconds, 120)));
begin
  select id into v_id
    from public.cms_translation_runs
   where status in ('queued','running')
     and (lease_until is null or lease_until < now())
   order by coalesce(started_at, created_at) asc
   limit 1
   for update skip locked;

  if v_id is null then
    return jsonb_build_object(
      'claimed', false,
      'pending', (select count(*) from public.cms_translation_runs where status in ('queued','running'))
    );
  end if;

  update public.cms_translation_runs
     set lease_owner = v_owner,
         lease_until = now() + make_interval(secs => v_secs),
         worker_last_seen = now(),
         status = 'running',
         started_at = coalesce(started_at, now())
   where id = v_id
  returning * into v_run;

  return jsonb_build_object(
    'claimed', true,
    'lease_owner', v_owner,
    'lease_until', v_run.lease_until,
    'run', to_jsonb(v_run),
    'pending', (select count(*) from public.cms_translation_runs where status in ('queued','running'))
  );
end;
$$;

create or replace function public.rpc_internal_translation_worker_heartbeat(
  p_run_id uuid,
  p_lease_owner uuid,
  p_lease_seconds integer default 120
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secs int := greatest(30, least(600, coalesce(p_lease_seconds, 120)));
  v_ok boolean := false;
begin
  update public.cms_translation_runs
     set lease_until = now() + make_interval(secs => v_secs),
         worker_last_seen = now()
   where id = p_run_id and lease_owner = p_lease_owner
  returning true into v_ok;
  return jsonb_build_object('success', coalesce(v_ok, false));
end;
$$;

create or replace function public.rpc_internal_translation_worker_release(
  p_run_id uuid,
  p_lease_owner uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean := false;
begin
  update public.cms_translation_runs
     set lease_owner = null,
         lease_until = null,
         worker_last_seen = now()
   where id = p_run_id and lease_owner = p_lease_owner
  returning true into v_ok;
  return jsonb_build_object('success', coalesce(v_ok, false));
end;
$$;

do $$
declare
  fn text;
  fns text[] := array[
    'public.rpc_internal_translation_worker_pending()',
    'public.rpc_internal_translation_worker_claim(integer)',
    'public.rpc_internal_translation_worker_heartbeat(uuid,uuid,integer)',
    'public.rpc_internal_translation_worker_release(uuid,uuid)'
  ];
begin
  foreach fn in array fns
  loop
    execute format('revoke all on function %s from public', fn);
    execute format('revoke all on function %s from anon', fn);
    execute format('revoke all on function %s from authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end;
$$;