const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

function getEmployeeId(req) {
  return (
    req.headers['x-employee-id'] ||
    req.query.employee_id ||
    req.body?.employee_id ||
    null
  );
}

function getManagerId(req) {
  return (
    req.headers['x-manager-id'] ||
    req.query.manager_id ||
    req.body?.manager_id ||
    null
  );
}

// ============================================================
// HELPER: Get course data from RapidAPI / Udemy
// ============================================================
async function searchCourses(skillName, limit = 5) {
  try {
    // Using RapidAPI Coursera/Udemy search endpoint
    // Note: Requires API key in environment variables
    const apiKey = process.env.RAPIDAPI_KEY || 'demo';
    const apiHost = process.env.RAPIDAPI_HOST || 'coursera-course-api.p.rapidapi.com';

    const endpoint = new URL('https://coursera-course-api.p.rapidapi.com/search');
    endpoint.searchParams.set('query', skillName);
    endpoint.searchParams.set('limit', String(limit));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': apiHost,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!response.ok) {
      throw new Error(`RapidAPI request failed with status ${response.status}`);
    }

    const payload = await response.json();

    // Transform API response to our format
    if (payload && payload.courses) {
      return payload.courses.map(course => ({
        title: course.name || course.title,
        provider: course.provider || 'Coursera',
        link: course.url || course.link || '#',
        duration: course.duration || 'Self-paced',
        rating: course.rating || 4.5,
        price: course.price || 'Free',
      })).slice(0, limit);
    }

    // Fallback to mock courses if API fails
    return generateMockCourses(skillName, limit);
  } catch (err) {
    console.error('Course search error:', err.message);
    // Return mock courses as fallback
    return generateMockCourses(skillName, limit);
  }
}

// ============================================================
// HELPER: Generate mock courses for demo/fallback
// ============================================================
function generateMockCourses(skillName, limit = 5) {
  const mockCourses = {
    javascript: [
      { title: 'Advanced JavaScript & ES6+', provider: 'Udemy', link: 'https://udemy.com/js', duration: '22h', rating: 4.8, price: '$15' },
      { title: 'Modern JavaScript: Complete Guide', provider: 'Udemy', link: 'https://udemy.com/js2', duration: '18h', rating: 4.7, price: '$14' },
      { title: 'JavaScript Algorithms & Data Structures', provider: 'freeCodeCamp', link: 'https://freecodecamp.org/js', duration: '8h', rating: 4.9, price: 'Free' },
    ],
    python: [
      { title: 'Python for Everybody', provider: 'Coursera', link: 'https://coursera.org/python', duration: '8 weeks', rating: 4.6, price: 'Free' },
      { title: 'Complete Python Bootcamp', provider: 'Udemy', link: 'https://udemy.com/python', duration: '22h', rating: 4.6, price: '$15' },
      { title: 'Python Advanced Concepts', provider: 'LinkedIn Learning', link: 'https://linkedin.com/python', duration: '4h', rating: 4.5, price: 'Subscription' },
    ],
    react: [
      { title: 'React - The Complete Guide', provider: 'Udemy', link: 'https://udemy.com/react', duration: '43h', rating: 4.7, price: '$15' },
      { title: 'React Fundamentals', provider: 'freeCodeCamp', link: 'https://freecodecamp.org/react', duration: '9h', rating: 4.8, price: 'Free' },
      { title: 'Advanced React Patterns', provider: 'egghead.io', link: 'https://egghead.io/react', duration: '6h', rating: 4.6, price: 'Subscription' },
    ],
    docker: [
      { title: 'Docker & Kubernetes: The Complete Guide', provider: 'Udemy', link: 'https://udemy.com/docker', duration: '21h', rating: 4.6, price: '$15' },
      { title: 'Docker Mastery', provider: 'Udemy', link: 'https://udemy.com/docker2', duration: '20h', rating: 4.7, price: '$14' },
      { title: 'Introduction to Docker', provider: 'Linux Academy', link: 'https://linuxacademy.com/docker', duration: '3h', rating: 4.5, price: 'Subscription' },
    ],
  };

  const skillKey = skillName.toLowerCase().replace(/\s+/g, '');
  const courses = mockCourses[skillKey] || [
    { title: `Master ${skillName}`, provider: 'Udemy', link: 'https://udemy.com/course', duration: '20h', rating: 4.6, price: '$15' },
    { title: `${skillName} for Beginners`, provider: 'freeCodeCamp', link: 'https://freecodecamp.org', duration: '8h', rating: 4.7, price: 'Free' },
    { title: `${skillName} Advanced`, provider: 'Coursera', link: 'https://coursera.org', duration: '6 weeks', rating: 4.5, price: 'Free' },
  ];

  return courses.slice(0, limit);
}

// ============================================================
// GET: Fetch messages for employee
// ============================================================
router.get('/inbox', async (req, res) => {
  try {
    const employeeId = getEmployeeId(req);
    if (!employeeId) {
      return res.status(401).json({ error: 'Employee ID required' });
    }

    const { data, error } = await supabase
      .from('manager_messages')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data || []);
  } catch (err) {
    console.error('Fetch inbox error:', err);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ============================================================
// GET: Fetch unread message count for employee
// ============================================================
router.get('/inbox/unread', async (req, res) => {
  try {
    const employeeId = getEmployeeId(req);
    if (!employeeId) {
      return res.status(401).json({ error: 'Employee ID required' });
    }

    const { count, error } = await supabase
      .from('manager_messages')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', employeeId)
      .eq('is_read', false);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ unread_count: count || 0 });
  } catch (err) {
    console.error('Fetch unread count error:', err);
    return res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// ============================================================
// GET: Fetch messages sent by manager
// ============================================================
router.get('/manager/sent', async (req, res) => {
  try {
    const managerId = getManagerId(req);
    if (!managerId) {
      return res.status(401).json({ error: 'Manager ID required' });
    }

    const requestedLimit = Number(req.query.limit);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 30;

    const { data, error } = await supabase
      .from('manager_messages')
      .select(`
        *,
        employees(id, name, email)
      `)
      .eq('manager_id', managerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data || []);
  } catch (err) {
    console.error('Fetch manager sent messages error:', err);
    return res.status(500).json({ error: 'Failed to fetch sent messages' });
  }
});

// ============================================================
// PATCH: Mark message as read
// ============================================================
router.patch('/:messageId/read', async (req, res) => {
  try {
    const { messageId } = req.params;
    const employeeId = getEmployeeId(req);

    if (!employeeId) {
      return res.status(401).json({ error: 'Employee ID required' });
    }

    const { data, error } = await supabase
      .from('manager_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('employee_id', employeeId)
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    return res.json(data[0]);
  } catch (err) {
    console.error('Mark read error:', err);
    return res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// ============================================================
// DELETE: Delete message
// ============================================================
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const employeeId = getEmployeeId(req);

    if (!employeeId) {
      return res.status(401).json({ error: 'Employee ID required' });
    }

    const { error } = await supabase
      .from('manager_messages')
      .delete()
      .eq('id', messageId)
      .eq('employee_id', employeeId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, message: 'Message deleted' });
  } catch (err) {
    console.error('Delete message error:', err);
    return res.status(500).json({ error: 'Failed to delete message' });
  }
});

// ============================================================
// POST: Send interview reminder (single or bulk)
// ============================================================
router.post('/reminder', async (req, res) => {
  try {
    const { manager_id, employee_ids, role_id, deadline, interview_type, custom_message } = req.body;
    const managerId = manager_id || getManagerId(req);

    if (!managerId || !employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
      return res.status(400).json({ error: 'manager_id and employee_ids array required' });
    }

    if (!deadline) {
      return res.status(400).json({ error: 'deadline required' });
    }

    // Fetch role info if provided
    let roleData = null;
    if (role_id) {
      const { data } = await supabase
        .from('roles')
        .select('id, name')
        .eq('id', role_id)
        .single();
      roleData = data;
    }

    // Calculate days until deadline
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const daysUntilDeadline = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));

    // Create messages for each employee
    const messages = employee_ids.map(employeeId => ({
      manager_id: managerId,
      employee_id: employeeId,
      message_type: 'interview_reminder',
      title: `Interview Reminder - ${roleData?.name || 'Practice Interview'}`,
      description: custom_message || `You have an upcoming interview for the ${roleData?.name || 'assigned'} role.`,
      content: {
        role_id: role_id || null,
        role_name: roleData?.name || 'General',
        deadline: deadline,
        days_until_deadline: daysUntilDeadline,
        interview_type: interview_type || 'skill_assessment',
      },
    }));

    const { data, error } = await supabase
      .from('manager_messages')
      .insert(messages)
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      success: true,
      created: data?.length || messages.length,
      messages: data,
    });
  } catch (err) {
    console.error('Send reminder error:', err);
    return res.status(500).json({ error: 'Failed to send reminders' });
  }
});

// ============================================================
// POST: Send course suggestion (single or bulk)
// ============================================================
router.post('/course-suggestion', async (req, res) => {
  try {
    const { manager_id, employee_ids, skill_name, custom_message } = req.body;
    const managerId = manager_id || getManagerId(req);

    if (!managerId || !employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
      return res.status(400).json({ error: 'manager_id and employee_ids array required' });
    }

    if (!skill_name) {
      return res.status(400).json({ error: 'skill_name required' });
    }

    // Fetch courses via API or mock
    const courses = await searchCourses(skill_name, 5);

    // Create messages for each employee
    const messages = employee_ids.map(employeeId => ({
      manager_id: managerId,
      employee_id: employeeId,
      message_type: 'course_suggestion',
      title: `Course Recommendation - ${skill_name}`,
      description: custom_message || `Your manager recommends courses to improve your ${skill_name} skills.`,
      content: {
        skill_name,
        proficiency_level: 'intermediate',
        reason: 'Skill gap identified',
        courses: courses,
      },
    }));

    const { data, error } = await supabase
      .from('manager_messages')
      .insert(messages)
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      success: true,
      created: data?.length || messages.length,
      messages: data,
    });
  } catch (err) {
    console.error('Send course suggestion error:', err);
    return res.status(500).json({ error: 'Failed to send course suggestions' });
  }
});

// ============================================================
// POST: Send content suggestion (single or bulk)
// ============================================================
router.post('/content-suggestion', async (req, res) => {
  try {
    const { manager_id, employee_ids, skill_gap_name, gap_type, resources, custom_message } = req.body;
    const managerId = manager_id || getManagerId(req);

    if (!managerId || !employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
      return res.status(400).json({ error: 'manager_id and employee_ids array required' });
    }

    if (!skill_gap_name) {
      return res.status(400).json({ error: 'skill_gap_name required' });
    }

    // Validate resources format
    const validResources = Array.isArray(resources) ? resources : generateMockResources(skill_gap_name);

    // Create messages for each employee
    const messages = employee_ids.map(employeeId => ({
      manager_id: managerId,
      employee_id: employeeId,
      message_type: 'content_suggestion',
      title: `Learning Resources - ${skill_gap_name}`,
      description: custom_message || `Your manager shared resources to help you develop ${skill_gap_name} skills.`,
      content: {
        skill_gap_name,
        gap_type: gap_type || 'required',
        resources: validResources,
      },
    }));

    const { data, error } = await supabase
      .from('manager_messages')
      .insert(messages)
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      success: true,
      created: data?.length || messages.length,
      messages: data,
    });
  } catch (err) {
    console.error('Send content suggestion error:', err);
    return res.status(500).json({ error: 'Failed to send content suggestions' });
  }
});

// ============================================================
// POST: Search courses by skill (for manager preview)
// ============================================================
router.post('/search-courses', async (req, res) => {
  try {
    const { skill, limit = 5 } = req.body;

    if (!skill) {
      return res.status(400).json({ error: 'skill parameter required' });
    }

    const courses = await searchCourses(skill, limit);

    return res.json({
      skill,
      courses,
      count: courses.length,
    });
  } catch (err) {
    console.error('Search courses error:', err);
    return res.status(500).json({ error: 'Failed to search courses' });
  }
});

// ============================================================
// HELPER: Generate mock learning resources
// ============================================================
function generateMockResources(skillName) {
  const mockResources = {
    javascript: [
      { title: 'MDN JavaScript Guide', type: 'documentation', link: 'https://mdn.org/js', estimated_time: '2h', description: 'Comprehensive JS reference' },
      { title: 'JavaScript.info', type: 'tutorial', link: 'https://javascript.info', estimated_time: '4h', description: 'Interactive JS tutorials' },
      { title: 'You Don\'t Know JS', type: 'article', link: 'https://github.com/getify/You-Dont-Know-JS', estimated_time: '8h', description: 'Deep dive into JS' },
    ],
    python: [
      { title: 'Python Official Docs', type: 'documentation', link: 'https://python.org/docs', estimated_time: '3h', description: 'Official Python documentation' },
      { title: 'Real Python', type: 'tutorial', link: 'https://realpython.com', estimated_time: '6h', description: 'Python tutorials and articles' },
      { title: 'Python Design Patterns', type: 'article', link: 'https://refactoring.guru/design-patterns/python', estimated_time: '4h', description: 'Design patterns in Python' },
    ],
    docker: [
      { title: 'Docker Official Docs', type: 'documentation', link: 'https://docs.docker.com', estimated_time: '2h', description: 'Official Docker documentation' },
      { title: 'Docker Curriculum', type: 'tutorial', link: 'https://docker-curriculum.com', estimated_time: '3h', description: 'Beginner friendly Docker guide' },
      { title: 'Docker Best Practices', type: 'article', link: 'https://docs.docker.com/develop/dev-best-practices', estimated_time: '1h', description: 'Best practices guide' },
    ],
  };

  const skillKey = skillName.toLowerCase().replace(/\s+/g, '');
  return mockResources[skillKey] || [
    { title: `Learn ${skillName}`, type: 'documentation', link: 'https://example.com', estimated_time: '2h', description: `Official ${skillName} documentation` },
    { title: `${skillName} Tutorial`, type: 'tutorial', link: 'https://example.com', estimated_time: '3h', description: `Easy to follow ${skillName} guide` },
    { title: `${skillName} Best Practices`, type: 'article', link: 'https://example.com', estimated_time: '1h', description: `Best practices for ${skillName}` },
  ];
}

module.exports = router;
