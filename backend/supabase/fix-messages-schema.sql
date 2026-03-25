-- ============================================================
-- FIX: Ensure manager_messages table exists
-- Run this in Supabase SQL Editor if inbox/messaging fails with
-- "Could not find the table 'public.manager_messages' in the schema cache"
-- ============================================================

CREATE TABLE IF NOT EXISTS manager_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID REFERENCES managers(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('interview_reminder', 'course_suggestion', 'content_suggestion')),
  title TEXT NOT NULL,
  description TEXT,
  content JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ,
  CONSTRAINT manager_owns_employee CHECK (manager_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_manager_messages_employee ON manager_messages(employee_id);
CREATE INDEX IF NOT EXISTS idx_manager_messages_manager ON manager_messages(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_messages_is_read ON manager_messages(is_read);

-- Optional: refresh with some demo rows after the table exists
-- Run backend/supabase/seed-messages.sql afterwards if you want sample messages.
