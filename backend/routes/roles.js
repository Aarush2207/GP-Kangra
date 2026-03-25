const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// ── Get all roles for manager ─────────────────────────────────
router.get('/', async (req, res) => {
  const { manager_id } = req.query;
  let query = supabase
    .from('roles')
    .select('*, role_skills(*)')
    .order('created_at', { ascending: false });
  if (manager_id) query = query.eq('manager_id', manager_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// ── Get single role ───────────────────────────────────────────
router.get('/:roleId', async (req, res) => {
  const { data, error } = await supabase
    .from('roles')
    .select('*, role_skills(*)')
    .eq('id', req.params.roleId)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Role not found' });
  res.json(data);
});

// ── Create role ───────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { manager_id, name, description, skills } = req.body;
  if (!name || !manager_id)
    return res.status(400).json({ error: 'name and manager_id are required' });

  const { data: role, error: roleErr } = await supabase
    .from('roles')
    .insert([{ manager_id, name, description }])
    .select()
    .single();

  if (roleErr) return res.status(500).json({ error: roleErr.message });

  if (skills && skills.length > 0) {
    const skillRows = skills.map(s => ({
      role_id: role.id,
      skill_name: typeof s === 'string' ? s : s.skill_name,
      importance: typeof s === 'object' ? s.importance || 'required' : 'required',
    }));
    await supabase.from('role_skills').insert(skillRows);
  }

  const { data: fullRole } = await supabase
    .from('roles')
    .select('*, role_skills(*)')
    .eq('id', role.id)
    .single();

  res.status(201).json(fullRole);
});

// ── Update role ───────────────────────────────────────────────
router.put('/:roleId', async (req, res) => {
  const { name, description, skills } = req.body;

  const { error: roleErr } = await supabase
    .from('roles')
    .update({ name, description })
    .eq('id', req.params.roleId);

  if (roleErr) return res.status(500).json({ error: roleErr.message });

  if (skills !== undefined) {
    // Replace all skills
    await supabase.from('role_skills').delete().eq('role_id', req.params.roleId);
    if (skills.length > 0) {
      const skillRows = skills.map(s => ({
        role_id: req.params.roleId,
        skill_name: typeof s === 'string' ? s : s.skill_name,
        importance: typeof s === 'object' ? s.importance || 'required' : 'required',
      }));
      await supabase.from('role_skills').insert(skillRows);
    }
  }

  const { data } = await supabase
    .from('roles')
    .select('*, role_skills(*)')
    .eq('id', req.params.roleId)
    .single();

  res.json(data);
});

// ── Delete role ───────────────────────────────────────────────
router.delete('/:roleId', async (req, res) => {
  const { error } = await supabase.from('roles').delete().eq('id', req.params.roleId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
