const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const { suggestCourses } = require('./courseService');

function normalizeSkillName(skill) {
  return String(skill || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function titleCaseSkill(skill) {
  return normalizeSkillName(skill)
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch (_) {
      // ignore malformed JSON
    }
  }

  return {};
}

router.get('/', async (req, res) => {
  try {
    const { manager_id } = req.query;

    let query = supabase
      .from('employees')
      .select(`
        *,
        roles(id, name, description),
        employee_skills(*)
      `)
      .order('created_at', { ascending: false });

    if (manager_id) {
      query = query.eq('manager_id', manager_id);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data || []);
  } catch (err) {
    console.error('Get employees error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/dashboard', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select(`
        *,
        managers(name),
        roles(
          id,
          name,
          description,
          role_skills(*)
        ),
        employee_skills(*)
      `)
      .eq('id', id)
      .single();

    if (employeeError || !employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const { data: interviews, error: interviewsError } = await supabase
      .from('interviews')
      .select('*')
      .eq('employee_id', id)
      .order('created_at', { ascending: false });

    if (interviewsError) {
      return res.status(500).json({ error: interviewsError.message });
    }

    const skills = employee.employee_skills || [];
    const completedInterviews = (interviews || []).filter(
      (interview) => interview.status === 'completed'
    );
    const lastInterview = completedInterviews[0] || interviews?.[0] || null;

    const requiredSkills = (employee.roles?.role_skills || [])
      .filter((skill) => (skill.importance || 'required') === 'required')
      .map((skill) => normalizeSkillName(skill.skill_name).toLowerCase());

    const employeeSkills = new Set(
      skills.map((skill) => normalizeSkillName(skill.skill_name).toLowerCase())
    );

    const roleBasedGaps = requiredSkills.filter((skill) => skill && !employeeSkills.has(skill));
    const lastSkillScores = toObject(lastInterview?.skill_scores);
    const interviewBasedGaps = Object.entries(lastSkillScores)
      .filter(([, score]) => Number(score) < 7)
      .map(([skill]) => normalizeSkillName(skill).toLowerCase())
      .filter(Boolean);

    const combinedGapKeys = [...new Set([...roleBasedGaps, ...interviewBasedGaps])];
    const skillGaps = combinedGapKeys.map((skill) => titleCaseSkill(skill));

    const lastEvaluation = toObject(lastInterview?.ai_evaluation);
    const savedCourseRecommendations = toArray(lastEvaluation.course_recommendations);
    const fallbackGapKeys =
      combinedGapKeys.length > 0
        ? combinedGapKeys
        : [
            ...new Set([
              ...Object.keys(lastSkillScores).map((skill) => normalizeSkillName(skill).toLowerCase()).filter(Boolean),
              ...requiredSkills,
              'communication',
              'problem solving',
              'technical fundamentals',
            ]),
          ].slice(0, 6);

    const fallbackCourseRecommendations = fallbackGapKeys.map((gapSkill) => ({
      skill_name: titleCaseSkill(gapSkill),
      reason: 'Skill gap detected',
      source: 'dashboard_fallback',
      gap_score: 2,
      courses: suggestCourses(gapSkill).slice(0, 3).map((course) => ({
        title: course.title,
        url: course.url,
        platform: course.platform || 'Online',
        price:
          course.price ||
          (course.platform && String(course.platform).toLowerCase() === 'youtube' ? 'Free' : 'Free Audit'),
        rating: course.rating || null,
      })),
    }));
    const courseRecommendations =
      savedCourseRecommendations.length > 0 ? savedCourseRecommendations : fallbackCourseRecommendations;

    return res.json({
      employee,
      stats: {
        totalSkills: skills.length,
        overallRating: Number(employee.overall_rating || 0),
        communicationRating: Number(employee.communication_rating || 0),
        completedInterviews: completedInterviews.length,
      },
      skillGaps,
      courseRecommendations,
      interviews: interviews || [],
      lastInterview,
    });
  } catch (err) {
    console.error('Employee dashboard error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/skills', async (req, res) => {
  try {
    const { id } = req.params;
    const skillName = normalizeSkillName(req.body.skill_name);
    const proficiency = req.body.proficiency || 'intermediate';
    const source = req.body.source || 'manual';

    if (!skillName) {
      return res.status(400).json({ error: 'skill_name is required' });
    }

    const { data: existing, error: existingError } = await supabase
      .from('employee_skills')
      .select('*')
      .eq('employee_id', id)
      .ilike('skill_name', skillName)
      .maybeSingle();

    if (existingError) {
      return res.status(500).json({ error: existingError.message });
    }

    if (existing) {
      return res.status(409).json({ error: 'Skill already exists for this employee' });
    }

    const { data, error } = await supabase
      .from('employee_skills')
      .insert([{
        employee_id: id,
        skill_name: skillName,
        proficiency,
        source,
      }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(data);
  } catch (err) {
    console.error('Add employee skill error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/skills/:skillId', async (req, res) => {
  try {
    const { id, skillId } = req.params;

    const { error } = await supabase
      .from('employee_skills')
      .delete()
      .eq('id', skillId)
      .eq('employee_id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Delete employee skill error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        managers(name),
        roles(id, name, description),
        employee_skills(*)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    return res.json(data);
  } catch (err) {
    console.error('Get employee error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const payload = {};

    ['name', 'phone', 'role_id'].forEach((field) => {
      if (req.body[field] !== undefined) {
        payload[field] = req.body[field] || null;
      }
    });

    if (req.body.experience_years !== undefined) {
      payload.experience_years = Number(req.body.experience_years) || 0;
    }

    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('employees')
      .update(payload)
      .eq('id', id)
      .select(`
        *,
        managers(name),
        roles(id, name, description),
        employee_skills(*)
      `)
      .single();

    if (error || !data) {
      return res.status(400).json({ error: error?.message || 'Unable to update employee' });
    }

    return res.json({ success: true, employee: data });
  } catch (err) {
    console.error('Update employee error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
