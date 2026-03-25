const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

router.post('/manager/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { data, error } = await supabase
      .from('managers')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .eq('password', password)
      .single();

    if (error || !data) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    return res.json({ success: true, user: { ...data, role: 'manager' } });
  } catch (err) {
    console.error('Manager login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/employee/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        roles(id, name, description),
        employee_skills(*)
      `)
      .eq('email', email.trim().toLowerCase())
      .eq('password', password)
      .single();

    if (error || !data) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    return res.json({ success: true, user: { ...data, role: 'employee' } });
  } catch (err) {
    console.error('Employee login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/employee/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      experience_years,
      manager_id,
      role_id,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data: existing, error: existingError } = await supabase
      .from('employees')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingError) {
      console.error('Employee lookup error:', existingError);
      return res.status(500).json({ error: 'Database error' });
    }

    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    let resolvedManagerId = manager_id || null;
    if (!resolvedManagerId) {
      const { data: defaultManager } = await supabase
        .from('managers')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      resolvedManagerId = defaultManager?.id || null;
    }

    const { data, error } = await supabase
      .from('employees')
      .insert([{
        name,
        email: normalizedEmail,
        password,
        phone: phone || null,
        experience_years: Number(experience_years) || 0,
        manager_id: resolvedManagerId,
        role_id: role_id || null,
      }])
      .select(`
        *,
        roles(id, name, description),
        employee_skills(*)
      `)
      .single();

    if (error) {
      console.error('Employee registration error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ success: true, user: { ...data, role: 'employee' } });
  } catch (err) {
    console.error('Employee registration exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
