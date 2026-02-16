/*
  # Rollback All Breaking Security Changes
  
  This completely reverts the last 3 migrations that caused 504 timeouts:
  - 20260216221521_fix_comprehensive_security_issues_final.sql
  - 20260216224326_restore_critical_indexes.sql  
  - 20260216224725_revert_security_changes_that_broke_system.sql
  
  We restore the system to its previously working state.
*/

-- =====================================================
-- 1. RESTORE INDEXES THAT WERE REMOVED
-- =====================================================

-- These were removed but are actually needed
CREATE INDEX IF NOT EXISTS idx_bonus_calculations_personnel ON bonus_calculations(personnel_id);
CREATE INDEX IF NOT EXISTS idx_bonus_rules_active ON bonus_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_coaching_feedbacks_chat_id ON coaching_feedbacks(chat_id);
CREATE INDEX IF NOT EXISTS idx_coaching_feedbacks_sent_at ON coaching_feedbacks(sent_at);
CREATE INDEX IF NOT EXISTS idx_chats_rating_score ON chats(rating_score);
CREATE INDEX IF NOT EXISTS idx_chats_rating_status ON chats(rating_status);
CREATE INDEX IF NOT EXISTS idx_alerts_chat_id ON alerts(chat_id);

-- =====================================================
-- 2. RESTORE VIEWS WITH PROPER SECURITY DEFINER
-- =====================================================

DROP VIEW IF EXISTS chat_messages_istanbul CASCADE;
CREATE OR REPLACE VIEW chat_messages_istanbul 
WITH (security_barrier=false, security_invoker=false) AS
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
CREATE OR REPLACE VIEW chats_istanbul 
WITH (security_barrier=false, security_invoker=false) AS
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
-- 3. RESTORE ORIGINAL RLS POLICIES
-- =====================================================

-- coaching_feedbacks: Restore simple policies
DROP POLICY IF EXISTS "Authenticated users can insert coaching feedbacks" ON coaching_feedbacks;
DROP POLICY IF EXISTS "Users can update their own coaching feedbacks" ON coaching_feedbacks;

CREATE POLICY "Authenticated users can insert coaching feedbacks"
  ON coaching_feedbacks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own coaching feedbacks"
  ON coaching_feedbacks
  FOR UPDATE
  TO authenticated
  USING (sent_by = auth.uid())
  WITH CHECK (sent_by = auth.uid());

-- bonus_calculations: Restore simple policies
DROP POLICY IF EXISTS "Authenticated users can delete bonus calculations" ON bonus_calculations;
DROP POLICY IF EXISTS "Authenticated users can insert bonus calculations" ON bonus_calculations;
DROP POLICY IF EXISTS "Authenticated users can update bonus calculations" ON bonus_calculations;

CREATE POLICY "Authenticated users can insert bonus calculations"
  ON bonus_calculations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update bonus calculations"
  ON bonus_calculations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete bonus calculations"
  ON bonus_calculations
  FOR DELETE
  TO authenticated
  USING (true);

-- bonus_rules: Restore simple policies
DROP POLICY IF EXISTS "Authenticated users can delete bonus rules" ON bonus_rules;
DROP POLICY IF EXISTS "Authenticated users can insert bonus rules" ON bonus_rules;
DROP POLICY IF EXISTS "Authenticated users can update bonus rules" ON bonus_rules;

CREATE POLICY "Authenticated users can insert bonus rules"
  ON bonus_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update bonus rules"
  ON bonus_rules
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete bonus rules"
  ON bonus_rules
  FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- 4. GRANT PROPER PERMISSIONS ON VIEWS
-- =====================================================

GRANT SELECT ON chat_messages_istanbul TO authenticated;
GRANT SELECT ON chat_messages_istanbul TO anon;
GRANT SELECT ON chats_istanbul TO authenticated;
GRANT SELECT ON chats_istanbul TO anon;
