import React, { useEffect, useState } from 'react';
import { Users2, Plus, Trash2, BarChart3, AlertCircle, TrendingUp, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import ManagerNavbar from '../../components/ManagerNavbar';
import { Spinner, Alert, Modal, SkillBadge } from '../../components/UI';
import { managerAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function TeamPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [alert, setAlert] = useState(null);
  const [teams, setTeams] = useState(JSON.parse(localStorage.getItem(`teams_${user.id}`) || '[]'));
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [expandedTeam, setExpandedTeam] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await managerAPI.getEmployees(user.id);
        setEmployees(res.data || []);
      } catch (err) {
        setAlert({ type: 'error', msg: 'Failed to load employees' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.id]);

  const saveTeams = (newTeams) => {
    setTeams(newTeams);
    localStorage.setItem(`teams_${user.id}`, JSON.stringify(newTeams));
  };

  const addTeam = () => {
    if (!teamName.trim() || selectedEmployees.length === 0) {
      setAlert({ type: 'warning', msg: 'Please enter a team name and select at least one employee' });
      return;
    }
    const newTeam = {
      id: Date.now(),
      name: teamName,
      members: selectedEmployees.map(id => employees.find(e => e.id === id)).filter(Boolean),
      createdAt: new Date().toISOString(),
    };
    saveTeams([...teams, newTeam]);
    setShowAddTeam(false);
    setTeamName('');
    setSelectedEmployees([]);
    setAlert({ type: 'success', msg: `Team "${teamName}" created successfully` });
  };

  const deleteTeam = (teamId) => {
    if (!confirm('Delete this team?')) return;
    saveTeams(teams.filter(t => t.id !== teamId));
    setAlert({ type: 'success', msg: 'Team deleted' });
  };

  const removeMember = (teamId, employeeId) => {
    const updated = teams.map(t =>
      t.id === teamId ? { ...t, members: t.members.filter(m => m.id !== employeeId) } : t
    );
    saveTeams(updated);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ManagerNavbar />
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ManagerNavbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Users2 size={28} className="text-blue-600" />
              Team Management
            </h1>
            <p className="text-gray-500 text-sm mt-2">Organize employees by teams and compare skill gaps</p>
          </div>
          <button onClick={() => setShowAddTeam(true)}
            className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Create Team
          </button>
        </div>

        {alert && <div className="mb-4"><Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} /></div>}

        {teams.length === 0 ? (
          <div className="card text-center py-12">
            <Users2 size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No teams yet</h3>
            <p className="text-gray-500 mb-4">Create your first team to organize employees and compare skills</p>
            <button onClick={() => setShowAddTeam(true)}
              className="btn-primary inline-flex items-center gap-2">
              <Plus size={16} /> Create Team
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {teams.map(team => {
              const isExpanded = expandedTeam === team.id;
              const teamSkillGaps = team.members.flatMap(emp => emp.skill_gaps || []);
              const skillGapSummary = [...new Set(teamSkillGaps)];

              // Calculate average ratings and scores
              const avgRating = team.members.length > 0
                ? (team.members.reduce((sum, emp) => sum + (emp.overall_rating || 0), 0) / team.members.length).toFixed(1)
                : 0;

              const teamSkillData = team.members.reduce((acc, emp) => {
                (emp.employee_skills || []).forEach(skill => {
                  const existing = acc.find(s => s.skill === skill.skill_name);
                  if (existing) {
                    existing.count++;
                  } else {
                    acc.push({ skill: skill.skill_name.length > 10 ? skill.skill_name.slice(0, 10) + '…' : skill.skill_name, count: 1 });
                  }
                });
                return acc;
              }, []).sort((a, b) => b.count - a.count).slice(0, 6);

              return (
                <div key={team.id} className="card">
                  {/* Team Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h2 className="text-xl font-bold text-gray-900">{team.name}</h2>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-medium">
                          {team.members.length} members
                        </span>
                        <span className="text-xs bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-medium">
                          ⭐ {avgRating}/10
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">Created {new Date(team.createdAt).toLocaleDateString()}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      <button onClick={() => deleteTeam(team.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="mt-6 pt-6 border-t border-gray-200 space-y-6">
                      {/* KPIs Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-blue-50 rounded-lg p-3">
                          <p className="text-xs text-gray-600">Team Size</p>
                          <p className="text-2xl font-bold text-blue-600 mt-1">{team.members.length}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3">
                          <p className="text-xs text-gray-600">Avg Rating</p>
                          <p className="text-2xl font-bold text-green-600 mt-1">{avgRating}/10</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3">
                          <p className="text-xs text-gray-600">Skill Gaps</p>
                          <p className="text-2xl font-bold text-purple-600 mt-1">{skillGapSummary.length}</p>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-3">
                          <p className="text-xs text-gray-600">Total Skills</p>
                          <p className="text-2xl font-bold text-orange-600 mt-1">
                            {team.members.reduce((sum, emp) => sum + (emp.employee_skills || []).length, 0)}
                          </p>
                        </div>
                      </div>

                      {/* Team Members Grid */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Team Members</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {team.members.map(emp => (
                            <div key={emp.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h5 className="font-semibold text-gray-900">{emp.name}</h5>
                                  <p className="text-xs text-gray-500 mt-0.5">{emp.roles?.name || 'No role'}</p>
                                </div>
                                <button onClick={() => removeMember(team.id, emp.id)}
                                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                                  <X size={14} />
                                </button>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-600">Rating:</span>
                                  <span className="text-sm font-semibold text-blue-600">{emp.overall_rating || 0}/10</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-600">Experience:</span>
                                  <span className="text-sm font-semibold text-green-600">{emp.experience_years || 0} yrs</span>
                                </div>
                              </div>
                              {(emp.employee_skills || []).length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <p className="text-xs text-gray-600 mb-2">Skills ({(emp.employee_skills || []).length})</p>
                                  <div className="flex flex-wrap gap-1">
                                    {(emp.employee_skills || []).slice(0, 3).map(skill => (
                                      <SkillBadge key={skill.id} skill_name={skill.skill_name} proficiency={skill.proficiency} />
                                    ))}
                                    {(emp.employee_skills || []).length > 3 && (
                                      <span className="text-xs text-gray-500 self-center">+{(emp.employee_skills || []).length - 3}</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Charts Section */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-gray-200">
                        {/* Top Skills Chart */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Team Skills Distribution</h4>
                          {teamSkillData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                              <BarChart data={teamSkillData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="skill" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Team Members" />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-64 flex items-center justify-center text-gray-400">No skills data</div>
                          )}
                        </div>

                        {/* Member Experience & Ratings Radar */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Member Capabilities</h4>
                          {team.members.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                              <RadarChart data={team.members.slice(0, 5).map(emp => ({
                                name: emp.name.length > 10 ? emp.name.slice(0, 10) + '…' : emp.name,
                                rating: emp.overall_rating || 0,
                                experience: Math.min(emp.experience_years || 0, 10),
                              }))}>
                                <PolarGrid />
                                <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 10 }} />
                                <Radar name="Overall Rating" dataKey="rating" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                              </RadarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-64 flex items-center justify-center text-gray-400">No members</div>
                          )}
                        </div>
                      </div>

                      {/* Skill Gaps Summary */}
                      {skillGapSummary.length > 0 && (
                        <div className="pt-6 border-t border-gray-200">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <AlertCircle size={16} className="text-orange-500" />
                            Team Skill Gaps ({skillGapSummary.length})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {skillGapSummary.slice(0, 8).map((skill, idx) => (
                              <span key={idx} className="text-sm bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-full font-medium">
                                {skill}
                              </span>
                            ))}
                            {skillGapSummary.length > 8 && (
                              <span className="text-sm text-gray-500 self-center">+{skillGapSummary.length - 8} more</span>
                            )}
                          </div>
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

      {/* Add Team Modal */}
      <Modal open={showAddTeam} onClose={() => { setShowAddTeam(false); setTeamName(''); setSelectedEmployees([]); }} title="Create New Team" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team Name *</label>
            <input className="input" placeholder="e.g., Frontend Team, Data Analytics Squad"
              value={teamName} onChange={e => setTeamName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Members *</label>
            <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
              {employees.map(emp => (
                <label key={emp.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-2 rounded">
                  <input type="checkbox"
                    checked={selectedEmployees.includes(emp.id)}
                    onChange={e => {
                      if (e.target.checked) setSelectedEmployees([...selectedEmployees, emp.id]);
                      else setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                    }}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">{emp.name}</p>
                    <p className="text-xs text-gray-500">{emp.roles?.name || 'No role'}</p>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">{selectedEmployees.length} selected</p>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
            <button onClick={() => { setShowAddTeam(false); setTeamName(''); setSelectedEmployees([]); }} className="btn-secondary">Cancel</button>
            <button onClick={addTeam} className="btn-primary">Create Team</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
