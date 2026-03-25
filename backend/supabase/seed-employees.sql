-- ============================================================
-- SEED DATA - Dummy Employees for Testing
-- Run this after backend/supabase/schema.sql has been executed
-- ============================================================

INSERT INTO employees (
  manager_id,
  name,
  email,
  password,
  experience_years
) VALUES
(
  (SELECT id FROM managers LIMIT 1),
  'Aarush',
  'aarush@gmail.com',
  '123456',
  0
),
(
  (SELECT id FROM managers LIMIT 1),
  'Aayan',
  'aayan@gmail.com',
  '123456',
  0
),
(
  (SELECT id FROM managers LIMIT 1),
  'Areen',
  'areen@gmail.com',
  '123456',
  0
),
(
  (SELECT id FROM managers LIMIT 1),
  'Piyush',
  'piyush@gmail.com',
  '123456',
  0
),
(
  (SELECT id FROM managers LIMIT 1),
  'Pushkar',
  'pushkar@gmail.com',
  '123456',
  0
);

INSERT INTO employee_skills (
  employee_id,
  skill_name,
  proficiency,
  source
) VALUES
(
  (SELECT id FROM employees WHERE email = 'aarush@gmail.com' LIMIT 1),
  'React',
  'advanced',
  'manual'
),
(
  (SELECT id FROM employees WHERE email = 'aarush@gmail.com' LIMIT 1),
  'JavaScript',
  'advanced',
  'manual'
),
(
  (SELECT id FROM employees WHERE email = 'aarush@gmail.com' LIMIT 1),
  'Node.js',
  'intermediate',
  'manual'
),
(
  (SELECT id FROM employees WHERE email = 'aayan@gmail.com' LIMIT 1),
  'Python',
  'advanced',
  'manual'
),
(
  (SELECT id FROM employees WHERE email = 'aayan@gmail.com' LIMIT 1),
  'SQL',
  'intermediate',
  'manual'
),
(
  (SELECT id FROM employees WHERE email = 'aayan@gmail.com' LIMIT 1),
  'Data Analysis',
  'intermediate',
  'manual'
),
(
  (SELECT id FROM employees WHERE email = 'areen@gmail.com' LIMIT 1),
  'UI Design',
  'advanced',
  'manual'
),
(
  (SELECT id FROM employees WHERE email = 'areen@gmail.com' LIMIT 1),
  'Figma',
  'advanced',
  'manual'
),
(
  (SELECT id FROM employees WHERE email = 'areen@gmail.com' LIMIT 1),
  'CSS',
  'intermediate',
  'manual'
),
(
  (SELECT id FROM employees WHERE email = 'piyush@gmail.com' LIMIT 1),
  'Java',
  'advanced',
  'manual'
),
(
  (SELECT id FROM employees WHERE email = 'piyush@gmail.com' LIMIT 1),
  'Spring Boot',
  'intermediate',
  'manual'
),
(
  (SELECT id FROM employees WHERE email = 'piyush@gmail.com' LIMIT 1),
  'Data Structures',
  'advanced',
  'manual'
),
(
  (SELECT id FROM employees WHERE email = 'pushkar@gmail.com' LIMIT 1),
  'Docker',
  'intermediate',
  'manual'
),
(
  (SELECT id FROM employees WHERE email = 'pushkar@gmail.com' LIMIT 1),
  'Linux',
  'advanced',
  'manual'
),
(
  (SELECT id FROM employees WHERE email = 'pushkar@gmail.com' LIMIT 1),
  'DevOps',
  'intermediate',
  'manual'
);

-- Optional verification
-- SELECT name, email, password FROM employees ORDER BY created_at DESC LIMIT 5;
-- SELECT e.name, s.skill_name, s.proficiency
-- FROM employee_skills s
-- JOIN employees e ON e.id = s.employee_id
-- ORDER BY e.name, s.skill_name;
