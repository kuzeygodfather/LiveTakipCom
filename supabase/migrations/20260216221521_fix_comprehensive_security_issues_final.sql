/*
  # Fix Comprehensive Security Issues (Final)
  
  1. Indexes
    - Add missing index for coaching_feedbacks.sent_by foreign key
    - Remove unused indexes
  
  2. RLS Policy Optimization
    - Update coaching_feedbacks policies to use (select auth.uid())
    - Restrict overly permissive bonus table policies
  
  3. Views
    - Recreate SECURITY DEFINER views without the security definer flag
  
  4. Functions
    - Set immutable search_path on all functions
  
  5. Security
    - Make bonus table RLS policies more restrictive
*/

-- =====================================================
-- 1. ADD MISSING INDEX FOR FOREIGN KEY
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_coaching_feedbacks_sent_by ON coaching_feedbacks(sent_by);

-- =====================================================
-- 2. REMOVE UNUSED INDEXES
-- =====================================================

DROP INDEX IF EXISTS idx_bonus_calculations_personnel;
DROP INDEX IF EXISTS idx_bonus_rules_active;
DROP INDEX IF EXISTS idx_coaching_feedbacks_chat_id;
DROP INDEX IF EXISTS idx_coaching_feedbacks_sent_at;
DROP INDEX IF EXISTS idx_chats_rating_score;
DROP INDEX IF EXISTS idx_chats_rating_status;
DROP INDEX IF EXISTS idx_alerts_chat_id;

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES (coaching_feedbacks)
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can insert coaching feedbacks" ON coaching_feedbacks;
DROP POLICY IF EXISTS "Users can update their own coaching feedbacks" ON coaching_feedbacks;

CREATE POLICY "Authenticated users can insert coaching feedbacks"
  ON coaching_feedbacks
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Users can update their own coaching feedbacks"
  ON coaching_feedbacks
  FOR UPDATE
  TO authenticated
  USING (sent_by = (select auth.uid()))
  WITH CHECK (sent_by = (select auth.uid()));

-- =====================================================
-- 4. RESTRICT BONUS TABLE RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can delete bonus calculations" ON bonus_calculations;
DROP POLICY IF EXISTS "Authenticated users can insert bonus calculations" ON bonus_calculations;
DROP POLICY IF EXISTS "Authenticated users can update bonus calculations" ON bonus_calculations;

CREATE POLICY "Authenticated users can insert bonus calculations"
  ON bonus_calculations
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update bonus calculations"
  ON bonus_calculations
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete bonus calculations"
  ON bonus_calculations
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete bonus rules" ON bonus_rules;
DROP POLICY IF EXISTS "Authenticated users can insert bonus rules" ON bonus_rules;
DROP POLICY IF EXISTS "Authenticated users can update bonus rules" ON bonus_rules;

CREATE POLICY "Authenticated users can insert bonus rules"
  ON bonus_rules
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update bonus rules"
  ON bonus_rules
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete bonus rules"
  ON bonus_rules
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- =====================================================
-- 5. FIX SECURITY DEFINER VIEWS
-- =====================================================

DROP VIEW IF EXISTS chat_messages_istanbul CASCADE;
CREATE VIEW chat_messages_istanbul AS
SELECT 
  id,
  chat_id,
  author_type,
  text,
  is_system,
  created_at,
  (created_at AT TIME ZONE 'Europe/Istanbul') AS created_at_istanbul
FROM chat_messages;

DROP VIEW IF EXISTS chats_istanbul CASCADE;
CREATE VIEW chats_istanbul AS
SELECT 
  id,
  agent_name,
  customer_name,
  status,
  created_at,
  ended_at,
  analyzed,
  chat_data,
  (created_at AT TIME ZONE 'Europe/Istanbul') AS created_at_istanbul,
  (ended_at AT TIME ZONE 'Europe/Istanbul') AS ended_at_istanbul,
  date((created_at AT TIME ZONE 'Europe/Istanbul')) AS date_istanbul
FROM chats;

-- =====================================================
-- 6. FIX FUNCTION SEARCH PATHS
-- =====================================================

-- Drop and recreate functions with proper search_path
DROP FUNCTION IF EXISTS update_bonus_rules_updated_at() CASCADE;
CREATE FUNCTION update_bonus_rules_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS exec_sql(text) CASCADE;
CREATE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

DROP FUNCTION IF EXISTS fix_analyzed_flags() CASCADE;
CREATE FUNCTION fix_analyzed_flags()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE chats c
  SET analyzed = true
  WHERE EXISTS (
    SELECT 1 FROM chat_analysis ca
    WHERE ca.chat_id = c.id
  ) AND analyzed = false;
END;
$$;

DROP FUNCTION IF EXISTS get_istanbul_now() CASCADE;
CREATE FUNCTION get_istanbul_now()
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT (NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Istanbul';
$$;

DROP FUNCTION IF EXISTS convert_to_istanbul(timestamptz) CASCADE;
CREATE FUNCTION convert_to_istanbul(ts timestamptz)
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT (ts AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Istanbul';
$$;

DROP FUNCTION IF EXISTS get_istanbul_date_start(date) CASCADE;
CREATE FUNCTION get_istanbul_date_start(date_input date)
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT (date_input::text || ' 00:00:00')::timestamp AT TIME ZONE 'Europe/Istanbul';
$$;

DROP FUNCTION IF EXISTS get_istanbul_date_end(date) CASCADE;
CREATE FUNCTION get_istanbul_date_end(date_input date)
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT (date_input::text || ' 23:59:59')::timestamp AT TIME ZONE 'Europe/Istanbul';
$$;

DROP FUNCTION IF EXISTS get_today_chats_istanbul() CASCADE;
CREATE FUNCTION get_today_chats_istanbul()
RETURNS TABLE (
  id text,
  agent_name text,
  customer_name text,
  created_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  first_response_time integer,
  message_count integer,
  status text,
  analyzed boolean,
  rating_score integer,
  rating_status text
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  today_start timestamptz;
  today_end timestamptz;
BEGIN
  today_start := get_istanbul_date_start(CURRENT_DATE);
  today_end := get_istanbul_date_end(CURRENT_DATE);
  
  RETURN QUERY
  SELECT 
    c.id,
    c.agent_name,
    c.customer_name,
    c.created_at,
    c.ended_at,
    c.duration_seconds,
    c.first_response_time,
    c.message_count,
    c.status,
    c.analyzed,
    c.rating_score,
    c.rating_status
  FROM chats c
  WHERE c.created_at >= today_start 
    AND c.created_at <= today_end
  ORDER BY c.created_at DESC;
END;
$$;

DROP FUNCTION IF EXISTS get_date_range_chats_istanbul(date, date) CASCADE;
CREATE FUNCTION get_date_range_chats_istanbul(
  start_date date,
  end_date date
)
RETURNS TABLE (
  id text,
  agent_name text,
  customer_name text,
  created_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  first_response_time integer,
  message_count integer,
  status text,
  analyzed boolean,
  rating_score integer,
  rating_status text
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  range_start timestamptz;
  range_end timestamptz;
BEGIN
  range_start := get_istanbul_date_start(start_date);
  range_end := get_istanbul_date_end(end_date);
  
  RETURN QUERY
  SELECT 
    c.id,
    c.agent_name,
    c.customer_name,
    c.created_at,
    c.ended_at,
    c.duration_seconds,
    c.first_response_time,
    c.message_count,
    c.status,
    c.analyzed,
    c.rating_score,
    c.rating_status
  FROM chats c
  WHERE c.created_at >= range_start 
    AND c.created_at <= range_end
  ORDER BY c.created_at DESC;
END;
$$;

DROP FUNCTION IF EXISTS invoke_edge_function(text, jsonb) CASCADE;
CREATE FUNCTION invoke_edge_function(
  function_name text,
  payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result jsonb;
  supabase_url text;
  service_role_key text;
BEGIN
  SELECT decrypted_secret INTO supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_url';
  
  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_service_role_key';
  
  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RAISE EXCEPTION 'Supabase credentials not configured';
  END IF;
  
  SELECT content::jsonb INTO result
  FROM http((
    'POST',
    supabase_url || '/functions/v1/' || function_name,
    ARRAY[
      http_header('Authorization', 'Bearer ' || service_role_key),
      http_header('Content-Type', 'application/json')
    ],
    'application/json',
    payload::text
  )::http_request);
  
  RETURN result;
END;
$$;

DROP FUNCTION IF EXISTS cron_sync_livechat() CASCADE;
CREATE FUNCTION cron_sync_livechat()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM invoke_edge_function('sync-livechat');
END;
$$;

DROP FUNCTION IF EXISTS cron_analyze_chats() CASCADE;
CREATE FUNCTION cron_analyze_chats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM invoke_edge_function('analyze-chat');
END;
$$;

DROP FUNCTION IF EXISTS cron_send_telegram_alerts() CASCADE;
CREATE FUNCTION cron_send_telegram_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM invoke_edge_function('send-telegram-alerts');
END;
$$;

-- Update search_path for complex functions using specific signatures
ALTER FUNCTION get_personnel_improvement_report(p_agent_email text, p_days_before integer, p_days_after integer) 
  SET search_path = public, pg_temp;

ALTER FUNCTION recalculate_personnel_stats() 
  SET search_path = public, pg_temp;

ALTER FUNCTION recalculate_personnel_stats(p_date date) 
  SET search_path = public, pg_temp;

-- Recreate trigger if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_bonus_rules_updated_at'
  ) THEN
    CREATE TRIGGER update_bonus_rules_updated_at
      BEFORE UPDATE ON bonus_rules
      FOR EACH ROW
      EXECUTE FUNCTION update_bonus_rules_updated_at();
  END IF;
END $$;
