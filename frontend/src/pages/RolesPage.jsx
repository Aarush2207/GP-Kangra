import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Award, AlertTriangle, ChevronDown, ChevronUp, Briefcase, X } from 'lucide-react';
import ManagerNavbar from '../components/ManagerNavbar';
import { Spinner, EmptyState, Alert, Modal } from '../components/UI';
import { rolesAPI, managerAPI } from '../api';
import { useAuth } from '../context/AuthContext';

export default function RolesPage() {
  const { user } = useAuth();
  const [roles, setRoles]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [alert, setAlert]               = useState(null);

  // Create role modal
  const [showCreate, setShowCreate]     = useState(false);
  const [roleName, setRoleName]         = useState('');
  const [roleDesc, setRoleDesc]         = useState('');
  const [skillInput, setSkillInput]     = useState('');
  const [skillImportance, setSkillImportance] = useState('required');
  const [newSkills, setNewSkills]       = useState([]);
  const [creating, setCreating]         = useState(false);

  // Ranking
  const [selectedRole, setSelectedRole] = useState(null);
  const [ranking, setRanking]           = useState(null);
  const [rankLoading, setRankLoading]   = useState(false);
  const [expandedRole, setExpandedRole] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await rolesAPI.getAll({ manager_id: user.id });
      setRoles(res.data || []);
    } catch {
      setAlert({ type: 'error', msg: 'Failed to load roles' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addSkillToList = () => {
    const s = skillInput.trim();
    if (!s) return;
    if (newSkills.find(sk => sk.skill_name.toLowerCase() === s.toLowerCase())) return;
    setNewSkills(prev => [...prev, { skill_name: s, importance: skillImportance }]);
    setSkillInput('');
  };

  const removeSkill = (name) => {
    setNewSkills(prev => prev.filter(s => s.skill_name !== name));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!roleName.trim()) return setAlert({ type: 'error', msg: 'Role name is required' });
    setCreating(true);
    try {
      await rolesAPI.create({
        manager_id: user.id,
        name: roleName.trim(),
        description: roleDesc.trim(),
        skills: newSkills,
      });
      setShowCreate(false);
      setRoleName(''); setRoleDesc(''); setNewSkills([]);
      setAlert({ type: 'success', msg: `Role "${roleName}" created!` });
      load();
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.error || 'Failed to create role' });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (roleId, name) => {
    if (!confirm(`Delete role "${name}"? This cannot be undone.`)) return;
    try {
      await rolesAPI.delete(roleId);
      setRoles(prev => prev.filter(r => r.id !== roleId));
      if (selectedRole?.id === roleId) { setSelectedRole(null); setRanking(null); }
      setAlert({ type: 'success', msg: 'Role deleted' });
    } catch {
      setAlert({ type: 'error', msg: 'Failed to delete role' });
    }
  };

  const handleRank = async (role) => {
    if (selectedRole?.id === role.id) {
      setSelectedRole(null); setRanking(null); return;
    }
    setSelectedRole(role);
    setRanking(null);
    setRankLoading(true);
    try {
      const res = await managerAPI.rankEmployees(user.id, role.id);
      setRanking(res.data);
    } catch {
      setAlert({ type: 'error', msg: 'Failed to rank employees' });
    } finally {
      setRankLoading(false);
    }
  };

  const importanceColor = {
    required:  'bg-red-100 text-red-700 border-red-200',
    preferred: 'bg-blue-100 text-blue-700 border-blue-200',
    optional:  'bg-gray-100 text-gray-600 border-gray-200',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ManagerNavbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
            <p className="text-gray-500 text-sm mt-1">
              {roles.length} role{roles.length !== 1 ? 's' : ''} defined
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Create Role
          </button>
        </div>

        {alert && (
          <div className="mb-4">
            <Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : roles.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={Briefcase}
              title="No roles defined yet"
              description="Create a role and define its required skills to start ranking employees."
              action={<button onClick={() => setShowCreate(true)} className="btn-primary">Create First Role</button>}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {roles.map(role => {
              const isExpanded = expandedRole === role.id;
              const isSelected = selectedRole?.id === role.id;
              const requiredSkills  = (role.role_skills || []).filter(s => s.importance === 'required');
              const preferredSkills = (role.role_skills || []).filter(s => s.importance === 'preferred');
              const optionalSkills  = (role.role_skills || []).filter(s => s.importance === 'optional');

              return (
                <div key={role.id} className={`card overflow-hidden transition-shadow hover:shadow-md ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>

                  {/* Role header */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-lg font-semibold text-gray-900">{role.name}</h2>
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            {(role.role_skills || []).length} skill{(role.role_skills || []).length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {role.description && (
                          <p className="text-sm text-gray-500 mt-1">{role.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {requiredSkills.slice(0, 5).map(s => (
                            <span key={s.id} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${importanceColor.required}`}>
                              {s.skill_name}
                            </span>
                          ))}
                          {preferredSkills.slice(0, 3).map(s => (
                            <span key={s.id} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${importanceColor.preferred}`}>
                              {s.skill_name}
                            </span>
                          ))}
                          {(role.role_skills || []).length > 8 && (
                            <span className="text-xs text-gray-400 self-center">
                              +{(role.role_skills || []).length - 8} more
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleRank(role)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          }`}
                        >
                          <Award size={14} />
                          {isSelected ? 'Hide Ranking' : 'Rank Employees'}
                        </button>
                        <button
                          onClick={() => setExpandedRole(isExpanded ? null : role.id)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <button
                          onClick={() => handleDelete(role.id, role.name)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded skills detail */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-gray-100 pt-4 bg-gray-50">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          { label: 'Required',  skills: requiredSkills,  key: 'required' },
                          { label: 'Preferred', skills: preferredSkills, key: 'preferred' },
                          { label: 'Optional',  skills: optionalSkills,  key: 'optional' },
                        ].map(({ label, skills, key }) => (
                          <div key={key}>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
                            {skills.length === 0 ? (
                              <p className="text-xs text-gray-400 italic">None</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {skills.map(s => (
                                  <span key={s.id} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${importanceColor[key]}`}>
                                    {s.skill_name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ranking panel */}
                  {isSelected && (
                    <div className="border-t border-gray-100 bg-blue-50/40 px-5 py-4">
                      <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-3">
                        <Award size={15} className="text-yellow-500" />
                        Employee Rankings for {role.name}
                      </h3>
                      {rankLoading ? (
                        <div className="flex items-center gap-2 py-4 text-gray-500 text-sm">
                          <Spinner size="sm" /> Computing rankings…
                        </div>
                      ) : !ranking ? null : (ranking.ranked?.length === 0 || !ranking.ranked) ? (
                        <div className="text-sm text-gray-500 py-3 flex items-center gap-2">
                          <AlertTriangle size={15} className="text-yellow-500" />
                          {ranking.message || 'No employees assigned to this role yet.'}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {ranking.ranked.map((emp, i) => (
                            <div key={emp.id} className={`flex items-center gap-3 p-3 rounded-lg bg-white border ${i === 0 ? 'border-yellow-300 shadow-sm' : 'border-gray-200'}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                                i === 0 ? 'bg-yellow-400 text-white' :
                                i === 1 ? 'bg-gray-300 text-gray-700' :
                                i === 2 ? 'bg-amber-600 text-white' :
                                'bg-gray-100 text-gray-500'
                              }`}>
                                #{i + 1}
                              </div>
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                {emp.name?.[0]?.toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-gray-900 text-sm">{emp.name}</span>
                                  <span className="text-xs text-gray-400">{emp.experience_years || 0} yr exp</span>
                                  {emp.overall_rating > 0 && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                      ⭐ {emp.overall_rating}/10
                                    </span>
                                  )}
                                </div>
                                {emp.missingSkills?.length > 0 && (
                                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                                    <AlertTriangle size={11} className="text-orange-400 flex-shrink-0" />
                                    <span className="text-xs text-gray-400">Missing:</span>
                                    {emp.missingSkills.slice(0, 4).map(s => (
                                      <span key={s} className="text-xs bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded-full">{s}</span>
                                    ))}
                                    {emp.missingSkills.length > 4 && (
                                      <span className="text-xs text-gray-400">+{emp.missingSkills.length - 4} more</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className={`text-xl font-bold ${i === 0 ? 'text-blue-600' : 'text-gray-700'}`}>
                                  {emp.compositeScore}
                                </div>
                                <div className="text-xs text-gray-400">score</div>
                                <div className="text-xs text-gray-400">{emp.skillMatchPct}% match</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Role Modal */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setNewSkills([]); setRoleName(''); setRoleDesc(''); }}
        title="Create New Role"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role Name *</label>
            <input
              className="input"
              placeholder="e.g. Senior Frontend Developer"
              value={roleName}
              onChange={e => setRoleName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Optional: brief description of the role…"
              value={roleDesc}
              onChange={e => setRoleDesc(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Skill name (e.g. React)"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkillToList(); } }}
              />
              <select
                className="input w-36"
                value={skillImportance}
                onChange={e => setSkillImportance(e.target.value)}
              >
                <option value="required">Required</option>
                <option value="preferred">Preferred</option>
                <option value="optional">Optional</option>
              </select>
              <button type="button" onClick={addSkillToList} className="btn-secondary flex items-center gap-1 flex-shrink-0">
                <Plus size={15} /> Add
              </button>
            </div>

            {newSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                {newSkills.map(s => (
                  <span
                    key={s.skill_name}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${importanceColor[s.importance]}`}
                  >
                    {s.skill_name}
                    <span className="opacity-50">({s.importance[0].toUpperCase()})</span>
                    <button type="button" onClick={() => removeSkill(s.skill_name)} className="ml-1 hover:opacity-70">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-2">Add skills to define role requirements. Press Enter or click Add.</p>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Creating…' : 'Create Role'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
