/*
  # Revert Breaking Security Changes
  
  This reverts the changes that broke the system functionality.
  We restore:
  1. SECURITY DEFINER views (required for proper data access)
  2. Original RLS policies for bonus tables (less restrictive but functional)
  3. Original coaching_feedbacks policies
*/

-- =====================================================
-- 1. RESTORE SECURITY DEFINER VIEWS
-- =====================================================

DROP VIEW IF EXISTS chat_messages_istanbul CASCADE;
CREATE VIEW chat_messages_istanbul 
WITH (security_invoker=false) AS
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
CREATE VIEW chats_istanbul 
WITH (security_invoker=false) AS
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
-- 2. RESTORE ORIGINAL BONUS TABLE RLS POLICIES
-- =====================================================

-- Restore bonus_calculations policies
DROP POLICY IF EXISTS "Authenticated users can delete bonus calculations" ON bonus_calculations;
DROP POLICY IF EXISTS "Authenticated users can insert bonus calculations" ON bonus_calculations;
DROP POLICY IF EXISTS "Authenticated users can update bonus calculations" ON bonus_calculations;

CREATE POLICY "Authenticated users can delete bonus calculations"
  ON bonus_calculations
  FOR DELETE
  TO authenticated
  USING (true);

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

-- Restore bonus_rules policies
DROP POLICY IF EXISTS "Authenticated users can delete bonus rules" ON bonus_rules;
DROP POLICY IF EXISTS "Authenticated users can insert bonus rules" ON bonus_rules;
DROP POLICY IF EXISTS "Authenticated users can update bonus rules" ON bonus_rules;

CREATE POLICY "Authenticated users can delete bonus rules"
  ON bonus_rules
  FOR DELETE
  TO authenticated
  USING (true);

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

-- =====================================================
-- 3. RESTORE ORIGINAL COACHING_FEEDBACKS POLICIES
-- =====================================================

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
