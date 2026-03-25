const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// ── Get all employees for a manager ─────────────────────────
router.get('/:managerId/employees', async (req, res) => {
  const { managerId } = req.params;
  const { data, error } = await supabase
    .from('employees')
    .select(`
      *,
      roles(id, name),
      employee_skills(*)
    `)
    .eq('manager_id', managerId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// ── Dashboard stats ──────────────────────────────────────────
router.get('/:managerId/stats', async (req, res) => {
  const { managerId } = req.params;

  const [empRes, roleRes, intRes] = await Promise.all([
    supabase.from('employees').select('id, overall_rating, role_id').eq('manager_id', managerId),
    supabase.from('roles').select('id, name').eq('manager_id', managerId),
    supabase.from('interviews')
      .select('id, status, overall_score')
      .eq('manager_id', managerId)
  ]);

  const employees = empRes.data || [];
  const roles = roleRes.data || [];
  const interviews = intRes.data || [];

  const avgRating = employees.length
    ? (employees.reduce((s, e) => s + (e.overall_rating || 0), 0) / employees.length).toFixed(1)
    : 0;

  const completedInterviews = interviews.filter(i => i.status === 'completed').length;

  res.json({
    totalEmployees: employees.length,
    totalRoles: roles.length,
    totalInterviews: interviews.length,
    completedInterviews,
    averageRating: parseFloat(avgRating),
    roles: roles.map(r => ({
      ...r,
      employeeCount: employees.filter(e => e.role_id === r.id).length
    }))
  });
});

// ── Update employee role (manager changes role dynamically) ──
router.patch('/:managerId/employees/:employeeId/role', async (req, res) => {
  const { managerId, employeeId } = req.params;
  const { role_id } = req.body;

  // Verify employee belongs to this manager
  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('id', employeeId)
    .eq('manager_id', managerId)
    .single();

  if (!emp) return res.status(403).json({ error: 'Employee not found or unauthorized' });

  const { data, error } = await supabase
    .from('employees')
    .update({ role_id: role_id || null, updated_at: new Date() })
    .eq('id', employeeId)
    .select(`*, roles(id, name), employee_skills(*)`)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, employee: data });
});

// ── Delete employee ──────────────────────────────────────────
router.delete('/:managerId/employees/:employeeId', async (req, res) => {
  const { managerId, employeeId } = req.params;

  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', employeeId)
    .eq('manager_id', managerId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ── Rank employees by role ────────────────────────────────────
router.post('/:managerId/roles/:roleId/rank', async (req, res) => {
  const { managerId, roleId } = req.params;

  const [empRes, roleSkillsRes] = await Promise.all([
    supabase
      .from('employees')
      .select('*, employee_skills(*)')
      .eq('manager_id', managerId)
      .eq('role_id', roleId),
    supabase
      .from('role_skills')
      .select('*')
      .eq('role_id', roleId)
  ]);

  const employees = empRes.data || [];
  const requiredSkills = roleSkillsRes.data || [];

  if (!employees.length)
    return res.json({ ranked: [], message: 'No employees assigned to this role' });

  const ranked = employees.map(emp => {
    const empSkillNames = (emp.employee_skills || []).map(s => s.skill_name.toLowerCase());
    const requiredNames = requiredSkills.filter(s => s.importance === 'required').map(s => s.skill_name.toLowerCase());
    const totalRequired = requiredNames.length;
    const matchedRequired = requiredNames.filter(s => empSkillNames.includes(s)).length;
    const skillMatchPct = totalRequired > 0 ? (matchedRequired / totalRequired) * 100 : 0;

    // Weighted score: skill match 50% + rating 30% + experience 20%
    const ratingScore = ((emp.overall_rating || 0) / 10) * 100;
    const expScore = Math.min((emp.experience_years || 0) * 10, 100);
    const compositeScore = (skillMatchPct * 0.5) + (ratingScore * 0.3) + (expScore * 0.2);

    const missingSkills = requiredSkills
      .filter(s => !empSkillNames.includes(s.skill_name.toLowerCase()))
      .map(s => s.skill_name);

    return {
      ...emp,
      skillMatchPct: Math.round(skillMatchPct),
      compositeScore: Math.round(compositeScore),
      missingSkills,
    };
  }).sort((a, b) => b.compositeScore - a.compositeScore);

  // Update rank in DB
  for (let i = 0; i < ranked.length; i++) {
    await supabase.from('employees').update({ rank: i + 1 }).eq('id', ranked[i].id);
  }

  res.json({ ranked });
});

module.exports = router;
