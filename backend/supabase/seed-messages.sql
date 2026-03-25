-- ============================================================
-- SEED DATA - Dummy Messages for Testing
-- Run this after the main schema.sql has been executed
-- ============================================================

-- Insert sample interview reminder messages
INSERT INTO manager_messages (manager_id, employee_id, message_type, title, description, content, is_read, created_at) VALUES
(
  (SELECT id FROM managers LIMIT 1),
  (SELECT id FROM employees LIMIT 1),
  'interview_reminder',
  'Interview Reminder - Senior Frontend Developer',
  'You have an upcoming interview practice for the Senior Frontend Developer role. Please prepare and complete it by the deadline.',
  jsonb_build_object(
    'role_id', NULL,
    'role_name', 'Senior Frontend Developer',
    'days_until_deadline', 7,
    'interview_type', 'skill_assessment',
    'deadline', '2026-04-01T00:00:00Z'
  ),
  FALSE,
  NOW() - INTERVAL '2 days'
),
(
  (SELECT id FROM managers LIMIT 1),
  (SELECT id FROM employees LIMIT 1),
  'interview_reminder',
  'Interview Reminder - React.js Practice',
  'Quick practice interview focused on your React.js skills. This will help validate your expertise.',
  jsonb_build_object(
    'role_id', NULL,
    'role_name', 'Frontend Developer',
    'days_until_deadline', 3,
    'interview_type', 'skill_focus',
    'deadline', '2026-03-28T00:00:00Z'
  ),
  TRUE,
  NOW() - INTERVAL '5 days'
);

-- Insert sample course suggestion messages
INSERT INTO manager_messages (manager_id, employee_id, message_type, title, description, content, is_read, created_at) VALUES
(
  (SELECT id FROM managers LIMIT 1),
  (SELECT id FROM employees LIMIT 1),
  'course_suggestion',
  'Course Recommendation - Advanced JavaScript',
  'Your manager recommends courses to strengthen your JavaScript skills, which are critical for your role.',
  jsonb_build_object(
    'skill_name', 'JavaScript',
    'proficiency_level', 'intermediate',
    'reason', 'Required for assigned role - Frontend Developer',
    'courses', jsonb_build_array(
      jsonb_build_object(
        'title', 'Advanced JavaScript & ES6+',
        'provider', 'Udemy',
        'link', 'https://www.udemy.com/course/advanced-javascript-es6/',
        'duration', '22 hours',
        'rating', 4.8,
        'price', '$15'
      ),
      jsonb_build_object(
        'title', 'Modern JavaScript: Complete Guide',
        'provider', 'Udemy',
        'link', 'https://www.udemy.com/course/modern-javascript/',
        'duration', '18 hours',
        'rating', 4.7,
        'price', '$14'
      ),
      jsonb_build_object(
        'title', 'JavaScript Algorithms & Data Structures',
        'provider', 'freeCodeCamp',
        'link', 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/',
        'duration', '8 hours',
        'rating', 4.9,
        'price', 'Free'
      )
    )
  ),
  FALSE,
  NOW() - INTERVAL '1 day'
),
(
  (SELECT id FROM managers LIMIT 1),
  (SELECT id FROM employees LIMIT 1),
  'course_suggestion',
  'Course Recommendation - TypeScript Mastery',
  'Based on your skill gaps, we recommend you take TypeScript courses to advance your career.',
  jsonb_build_object(
    'skill_name', 'TypeScript',
    'proficiency_level', 'beginner',
    'reason', 'Skill gap identified - needed for senior level roles',
    'courses', jsonb_build_array(
      jsonb_build_object(
        'title', 'Understanding TypeScript',
        'provider', 'Udemy',
        'link', 'https://www.udemy.com/course/understanding-typescript/',
        'duration', '16 hours',
        'rating', 4.7,
        'price', '$15'
      ),
      jsonb_build_object(
        'title', 'TypeScript Complete Developer Guide',
        'provider', 'Udemy',
        'link', 'https://www.udemy.com/course/typescript-the-complete-developers-guide/',
        'duration', '20 hours',
        'rating', 4.6,
        'price', '$14'
      )
    )
  ),
  TRUE,
  NOW() - INTERVAL '10 days'
);

-- Insert sample content suggestion messages
INSERT INTO manager_messages (manager_id, employee_id, message_type, title, description, content, is_read, created_at) VALUES
(
  (SELECT id FROM managers LIMIT 1),
  (SELECT id FROM employees LIMIT 1),
  'content_suggestion',
  'Learning Resources - Docker Containerization',
  'Your manager shared curated learning resources to help you master Docker, a critical DevOps skill.',
  jsonb_build_object(
    'skill_gap_name', 'Docker',
    'gap_type', 'required',
    'resources', jsonb_build_array(
      jsonb_build_object(
        'title', 'Docker Official Documentation',
        'type', 'documentation',
        'link', 'https://docs.docker.com',
        'estimated_time', '2 hours',
        'description', 'Comprehensive Docker documentation covering all official features'
      ),
      jsonb_build_object(
        'title', 'Docker Curriculum - A Complete Guide',
        'type', 'tutorial',
        'link', 'https://docker-curriculum.com/',
        'estimated_time', '3 hours',
        'description', 'Beginner-friendly interactive Docker guide with hands-on examples'
      ),
      jsonb_build_object(
        'title', 'Docker Best Practices',
        'type', 'article',
        'link', 'https://docs.docker.com/develop/dev-best-practices/',
        'estimated_time', '1 hour',
        'description', 'Essential best practices for writing production-grade Docker applications'
      ),
      jsonb_build_object(
        'title', 'Getting Started with Docker',
        'type', 'video',
        'link', 'https://www.youtube.com/watch?v=fqMOX6JJhGo',
        'estimated_time', '45 minutes',
        'description', 'YouTube tutorial for Docker fundamentals and basic concepts'
      )
    )
  ),
  FALSE,
  NOW()
),
(
  (SELECT id FROM managers LIMIT 1),
  (SELECT id FROM employees LIMIT 1),
  'content_suggestion',
  'Learning Resources - System Design Fundamentals',
  'Resources to help you understand system design principles needed for senior-level interviews.',
  jsonb_build_object(
    'skill_gap_name', 'System Design',
    'gap_type', 'preferred',
    'resources', jsonb_build_array(
      jsonb_build_object(
        'title', 'Design Gurus - System Design Interview',
        'type', 'tutorial',
        'link', 'https://www.designgurus.io/system-design',
        'estimated_time', '10 hours',
        'description', 'Complete system design course with real interview questions'
      ),
      jsonb_build_object(
        'title', 'System Design Interview Prep',
        'type', 'article',
        'link', 'https://github.com/donnemartin/system-design-primer',
        'estimated_time', '6 hours',
        'description', 'GitHub resource with extensive system design learning materials'
      ),
      jsonb_build_object(
        'title', 'Designing Data-Intensive Applications',
        'type', 'documentation',
        'link', 'https://dataintensive.net/',
        'estimated_time', '15 hours',
        'description', 'In-depth guide on distributed systems and data architecture'
      )
    )
  ),
  TRUE,
  NOW() - INTERVAL '7 days'
);

-- ============================================================
-- Verify insertion
-- ============================================================
-- SELECT COUNT(*) as total_messages FROM manager_messages;
-- SELECT message_type, COUNT(*) FROM manager_messages GROUP BY message_type;
