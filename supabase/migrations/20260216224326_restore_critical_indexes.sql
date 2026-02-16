-- Restore critical indexes
CREATE INDEX IF NOT EXISTS idx_bonus_calculations_personnel ON bonus_calculations(personnel_id);
CREATE INDEX IF NOT EXISTS idx_bonus_rules_active ON bonus_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_coaching_feedbacks_chat_id ON coaching_feedbacks(chat_id);
CREATE INDEX IF NOT EXISTS idx_coaching_feedbacks_sent_at ON coaching_feedbacks(sent_at);
CREATE INDEX IF NOT EXISTS idx_chats_rating_score ON chats(rating_score);
CREATE INDEX IF NOT EXISTS idx_chats_rating_status ON chats(rating_status);
CREATE INDEX IF NOT EXISTS idx_alerts_chat_id ON alerts(chat_id);
