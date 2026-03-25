import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Briefcase, Award, AlertCircle, CheckCircle } from 'lucide-react';
import ManagerNavbar from '../../components/ManagerNavbar';
import { Spinner, Alert, SkillBadge, RatingBar } from '../../components/UI';
import { employeeAPI } from '../../api';

export default function EmployeeDetailPage() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: dashboard } = await employeeAPI.getDashboard(employeeId);
        setData(dashboard);
      } catch (err) {
        setAlert({ type: 'error', msg: 'Failed to load employee details' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [employeeId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ManagerNavbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        </div>
      </div>
    );
  }

  if (!data?.employee) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ManagerNavbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button onClick={() => navigate('/manager/employees')} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6">
            <ArrowLeft size={16} /> Back
          </button>
          {alert && <Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} />}
          <div className="card p-12 text-center">
            <AlertCircle size={40} className="mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Employee Not Found</h2>
            <p className="text-gray-500">This employee record could not be found.</p>
          </div>
        </div>
      </div>
    );
  }

  const { employee, stats, skillGaps } = data;
  const allSkills = employee.employee_skills || [];
  const roleName = employee.roles?.name;

  return (
    <div className="min-h-screen bg-gray-50">
      <ManagerNavbar />
      <div className="max-w-4xl mx-auto px-4 py-8 page-enter">
        {/* Back button */}
        <button onClick={() => navigate('/manager/employees')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 font-medium transition-colors">
          <ArrowLeft size={16} /> Back to Employees
        </button>

        {alert && <div className="mb-4"><Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} /></div>}

        {/* Header */}
        <div className="card mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-2xl flex-shrink-0">
              {employee.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{employee.name}</h1>
              <p className="text-gray-500 mt-1">{employee.email}</p>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {roleName && (
                  <div className="flex items-center gap-1.5 text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full">
                    <Briefcase size={14} />
                    {roleName}
                  </div>
                )}
                {employee.overall_rating > 0 && (
                  <div className="flex items-center gap-1.5 text-sm bg-green-50 text-green-700 px-3 py-1.5 rounded-full">
                    <Award size={14} />
                    ⭐ {employee.overall_rating}/10 Overall
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contact & Experience */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Mail size={14} />
              Email
            </div>
            <p className="text-gray-900 font-medium text-sm break-all">{employee.email}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Phone size={14} />
              Phone
            </div>
            <p className="text-gray-900 font-medium text-sm">{employee.phone || '—'}</p>
          </div>
          <div className="card">
            <div className="text-gray-500 text-sm mb-1">Experience</div>
            <p className="text-gray-900 font-medium text-sm">{employee.experience_years || 0} years</p>
          </div>
        </div>

        {/* Ratings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          {/* Overall Rating */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Overall Rating</h3>
            <RatingBar
              label="Performance"
              value={stats.overallRating}
              color={stats.overallRating >= 7 ? 'green' : stats.overallRating >= 5 ? 'blue' : 'orange'}
            />
            <p className="text-sm text-gray-500 mt-2">{stats.overallRating}/10</p>
          </div>

          {/* Communication Rating */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Communication Rating</h3>
            <RatingBar
              label="Communication"
              value={stats.communicationRating}
              color={stats.communicationRating >= 7 ? 'green' : stats.communicationRating >= 5 ? 'blue' : 'orange'}
            />
            <p className="text-sm text-gray-500 mt-2">{stats.communicationRating}/10</p>
          </div>
        </div>

        {/* Skills */}
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">
              ✓
            </span>
            Skills ({stats.totalSkills})
          </h3>

          {allSkills.length > 0 ? (
            <div className="space-y-3">
              {allSkills.map(skill => (
                <div key={skill.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2">
                    <SkillBadge skill_name={skill.skill_name} proficiency={skill.proficiency} />
                    <span className="text-xs text-gray-400">• {skill.source}</span>
                  </div>
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded capitalize">
                    {skill.proficiency}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No skills documented yet</p>
          )}
        </div>

        {/* Skill Gaps */}
        {roleName && skillGaps && skillGaps.length > 0 && (
          <div className="card border-2 border-orange-200 bg-orange-50 mb-6">
            <h3 className="font-semibold text-orange-900 mb-4 flex items-center gap-2">
              <AlertCircle size={18} />
              Skills to Develop for {roleName} ({skillGaps.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {skillGaps.map((skill, idx) => (
                <div key={idx} className="text-sm bg-white text-orange-700 border border-orange-300 px-3 py-1.5 rounded-full font-medium">
                  {skill}
                </div>
              ))}
            </div>
            <p className="text-sm text-orange-700 mt-3">
              💡 Recommend training or upskilling in these areas to excel in the {roleName} role.
            </p>
          </div>
        )}

        {/* Role Skills Match */}
        {roleName && employee.roles?.role_skills && employee.roles.role_skills.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Required Skills for {roleName}</h3>
            <div className="space-y-2">
              {employee.roles.role_skills
                .filter(rs => (rs.importance || 'required') === 'required')
                .map((rs, idx) => {
                  const hasSkill = allSkills.some(s =>
                    s.skill_name.toLowerCase().replace(/\s+/g, ' ') ===
                    rs.skill_name.toLowerCase().replace(/\s+/g, ' ')
                  );
                  return (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      {hasSkill ? (
                        <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                      ) : (
                        <AlertCircle size={18} className="text-orange-500 flex-shrink-0" />
                      )}
                      <span className={`text-sm font-medium ${hasSkill ? 'text-green-700' : 'text-orange-700'}`}>
                        {rs.skill_name}
                      </span>
                      <span className={`text-xs ml-auto px-2 py-1 rounded ${hasSkill ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {hasSkill ? '✓ Acquired' : 'Required'}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
