import React, { useEffect, useState } from 'react';
import { User, Plus, Trash2, Save } from 'lucide-react';
import EmployeeNavbar from '../../components/EmployeeNavbar';
import { SkillBadge, Spinner, Alert } from '../../components/UI';
import { employeeAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function EmployeeProfile() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [alert, setAlert]       = useState(null);

  // Form
  const [form, setForm] = useState({ name: '', phone: '', experience_years: '' });

  // Skill add
  const [skillName, setSkillName]   = useState('');
  const [skillProf, setSkillProf]   = useState('intermediate');
  const [addingSkill, setAddingSkill] = useState(false);

  const load = () => {
    setLoading(true);
    employeeAPI.getProfile(user.id)
      .then(r => {
        setProfile(r.data);
        setForm({
          name:             r.data.name || '',
          phone:            r.data.phone || '',
          experience_years: r.data.experience_years || '',
        });
      })
      .catch(() => setAlert({ type: 'error', msg: 'Failed to load profile' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user.id]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await employeeAPI.update(user.id, {
        name:             form.name,
        phone:            form.phone,
        experience_years: parseFloat(form.experience_years) || 0,
      });
      setProfile(prev => ({ ...prev, ...data.employee }));
      updateUser({ name: form.name });
      setAlert({ type: 'success', msg: 'Profile updated successfully' });
    } catch {
      setAlert({ type: 'error', msg: 'Failed to save changes' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = async () => {
    const s = skillName.trim();
    if (!s) return;
    setAddingSkill(true);
    try {
      const { data } = await employeeAPI.addSkill(user.id, {
        skill_name:  s,
        proficiency: skillProf,
        source:      'manual',
      });
      setProfile(prev => ({
        ...prev,
        employee_skills: [...(prev.employee_skills || []), data],
      }));
      setSkillName('');
      setAlert({ type: 'success', msg: 'Skill added' });
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.error || 'Failed to add skill' });
    } finally {
      setAddingSkill(false);
    }
  };

  const handleDeleteSkill = async (skillId) => {
    try {
      await employeeAPI.deleteSkill(user.id, skillId);
      setProfile(prev => ({
        ...prev,
        employee_skills: (prev.employee_skills || []).filter(s => s.id !== skillId),
      }));
    } catch {
      setAlert({ type: 'error', msg: 'Failed to remove skill' });
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <EmployeeNavbar />
      <div className="flex justify-center py-20"><Spinner size="lg" /></div>
    </div>
  );

  const skills = profile?.employee_skills || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <EmployeeNavbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 page-enter">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

        {alert && <div className="mb-4"><Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} /></div>}

        {/* Profile info card */}
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold">
              {profile?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{profile?.name}</h2>
              <p className="text-sm text-gray-500">{profile?.email}</p>
              {profile?.roles?.name && <p className="text-xs text-blue-600 mt-0.5">{profile.roles.name}</p>}
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input className="input" placeholder="+1234567890" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                <input type="number" min="0" max="50" className="input" value={form.experience_years}
                  onChange={e => setForm(f => ({ ...f, experience_years: e.target.value }))} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input className="input bg-gray-50" value={profile?.email || ''} disabled />
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              <Save size={16} /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Skills card */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Skills ({skills.length})</h2>

          {/* Add skill */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <input className="input flex-1 min-w-0" placeholder="Add a skill (e.g. Python)"
              value={skillName} onChange={e => setSkillName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); } }}
            />
            <select className="input w-36" value={skillProf} onChange={e => setSkillProf(e.target.value)}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
            <button onClick={handleAddSkill} disabled={addingSkill || !skillName.trim()} className="btn-primary flex items-center gap-1">
              <Plus size={16} /> {addingSkill ? '…' : 'Add'}
            </button>
          </div>

          {skills.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No skills yet — upload a resume or add manually</p>
          ) : (
            <div className="space-y-4">
              {['resume', 'interview', 'manual'].map(src => {
                const srcSkills = skills.filter(s => s.source === src);
                if (!srcSkills.length) return null;
                return (
                  <div key={src}>
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">
                      {src === 'resume' ? '📄 From Resume' : src === 'interview' ? '🎤 From Interview' : '✏️ Added Manually'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {srcSkills.map(s => (
                        <SkillBadge
                          key={s.id}
                          skill_name={s.skill_name}
                          proficiency={s.proficiency}
                          onRemove={() => handleDeleteSkill(s.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
