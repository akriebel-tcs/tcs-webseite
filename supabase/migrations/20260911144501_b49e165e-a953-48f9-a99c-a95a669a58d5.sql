-- Interner, nicht über die Daten-API erreichbarer Bereich für Schutzmechanik.
CREATE SCHEMA IF NOT EXISTS cms_internal;

REVOKE ALL ON SCHEMA cms_internal FROM PUBLIC;
REVOKE ALL ON SCHEMA cms_internal FROM anon, authenticated;
GRANT USAGE ON SCHEMA cms_internal TO service_role;

CREATE TABLE IF NOT EXISTS cms_internal.rate_limit_counters (
  bucket text NOT NULL,
  subject text NOT NULL,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  hits integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket, subject)
);

REVOKE ALL ON cms_internal.rate_limit_counters FROM PUBLIC;
REVOKE ALL ON cms_internal.rate_limit_counters FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cms_internal.rate_limit_counters TO service_role;

ALTER TABLE cms_internal.rate_limit_counters ENABLE ROW LEVEL SECURITY;

-- Atomarer Zähler: ein Aufruf = ein Versuch. Fenster läuft rollierend ab.
CREATE OR REPLACE FUNCTION cms_internal.rate_limit_hit(
  p_bucket text,
  p_subject text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = cms_internal, pg_temp
AS $$
DECLARE
  v_now timestamptz := now();
  v_hits integer;
  v_started timestamptz;
BEGIN
  IF p_bucket IS NULL OR btrim(p_bucket) = '' OR p_subject IS NULL OR btrim(p_subject) = '' THEN
    RAISE EXCEPTION 'bucket_and_subject_required';
  END IF;
  IF p_limit IS NULL OR p_limit < 1 OR p_window_seconds IS NULL OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'invalid_limit_or_window';
  END IF;

  INSERT INTO cms_internal.rate_limit_counters AS c (bucket, subject, window_started_at, hits, updated_at)
  VALUES (p_bucket, p_subject, v_now, 1, v_now)
  ON CONFLICT (bucket, subject) DO UPDATE
    SET hits = CASE
                 WHEN c.window_started_at < v_now - make_interval(secs => p_window_seconds) THEN 1
                 ELSE c.hits + 1
               END,
        window_started_at = CASE
                 WHEN c.window_started_at < v_now - make_interval(secs => p_window_seconds) THEN v_now
                 ELSE c.window_started_at
               END,
        updated_at = v_now
  RETURNING c.hits, c.window_started_at INTO v_hits, v_started;

  -- Aufräumen alter Zeilen, günstig und selten.
  IF random() < 0.02 THEN
    DELETE FROM cms_internal.rate_limit_counters
    WHERE updated_at < v_now - interval '1 day';
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_hits <= p_limit,
    'hits', v_hits,
    'limit', p_limit,
    'remaining', GREATEST(p_limit - v_hits, 0),
    'retry_after', GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM (v_started + make_interval(secs => p_window_seconds)) - v_now))::int
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION cms_internal.rate_limit_hit(text, text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION cms_internal.rate_limit_hit(text, text, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION cms_internal.rate_limit_hit(text, text, integer, integer) TO service_role;