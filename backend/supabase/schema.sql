-- ============================================================
-- SKILL PROJECT - Complete Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Drop existing tables if re-running
DROP TABLE IF EXISTS interview_answers CASCADE;
DROP TABLE IF EXISTS interviews CASCADE;
DROP TABLE IF EXISTS employee_skills CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS role_skills CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS managers CASCADE;

-- ============================================================
-- MANAGERS TABLE
-- ============================================================
CREATE TABLE managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ROLES TABLE
-- ============================================================
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID REFERENCES managers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ROLE SKILLS TABLE (skills required per role)
-- ============================================================
CREATE TABLE role_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  importance TEXT DEFAULT 'required' CHECK (importance IN ('required', 'preferred', 'bonus')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- EMPLOYEES TABLE (with auth support)
-- ============================================================
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID REFERENCES managers(id) ON DELETE SET NULL,
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT,
  experience_years NUMERIC DEFAULT 0,
  resume_text TEXT,
  resume_filename TEXT,
  overall_rating NUMERIC DEFAULT 0 CHECK (overall_rating >= 0 AND overall_rating <= 10),
  communication_rating NUMERIC DEFAULT 0 CHECK (communication_rating >= 0 AND communication_rating <= 10),
  rank INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- EMPLOYEE SKILLS TABLE (skills extracted from resume / interview)
-- ============================================================
CREATE TABLE employee_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  proficiency TEXT DEFAULT 'intermediate' CHECK (proficiency IN ('beginner', 'intermediate', 'advanced', 'expert')),
  source TEXT DEFAULT 'resume' CHECK (source IN ('resume', 'interview', 'manual')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INTERVIEWS TABLE
-- ============================================================
CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES managers(id) ON DELETE SET NULL,
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  questions JSONB DEFAULT '[]',
  ai_evaluation JSONB DEFAULT '{}',
  skill_scores JSONB DEFAULT '{}',
  overall_score NUMERIC DEFAULT 0,
  communication_score NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- INTERVIEW ANSWERS TABLE
-- ============================================================
CREATE TABLE interview_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MANAGER MESSAGES TABLE (Interview reminders, course/content suggestions)
-- ============================================================
CREATE TABLE manager_messages (
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

-- ============================================================
-- SEED DATA - Default Manager
-- ============================================================
INSERT INTO managers (name, email, password) VALUES
  ('Admin Manager', 'manager@company.com', 'manager123');

-- ============================================================
-- SEED DATA - Test Employee
-- ============================================================
INSERT INTO employees (name, email, password, phone, experience_years) VALUES
  ('John Doe', 'john@company.com', 'employee123', '+1234567890', 5);

-- ============================================================
-- SEED DATA - Sample Messages (Dummy Data for Testing)
-- ============================================================
-- Get manager and employee IDs first (these will be replaced with actual UUIDs from your DB)
-- For now, we'll insert after you run the above inserts

-- Insert sample interview reminder message
-- INSERT INTO manager_messages (manager_id, employee_id, message_type, title, description, content, is_read)
-- VALUES (
--   (SELECT id FROM managers LIMIT 1),
--   (SELECT id FROM employees LIMIT 1),
--   'interview_reminder',
--   'Interview Reminder - Senior Frontend Developer',
--   'You have an upcoming interview for the Senior Frontend Developer role.',
--   '{"role_id": null, "role_name": "Senior Frontend Developer", "days_until_deadline": 7, "interview_type": "skill_assessment", "deadline": "2026-04-01"}'::jsonb,
--   FALSE
-- );

-- ============================================================

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_employees_manager ON employees(manager_id);
CREATE INDEX idx_employees_role ON employees(role_id);
CREATE INDEX idx_employee_skills_employee ON employee_skills(employee_id);
CREATE INDEX idx_role_skills_role ON role_skills(role_id);
CREATE INDEX idx_interviews_employee ON interviews(employee_id);
CREATE INDEX idx_manager_messages_employee ON manager_messages(employee_id);
CREATE INDEX idx_manager_messages_manager ON manager_messages(manager_id);
CREATE INDEX idx_manager_messages_is_read ON manager_messages(is_read);
