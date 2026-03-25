import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Star, Briefcase, BookOpen, MessageSquare, TrendingUp, ArrowRight, AlertTriangle, ExternalLink } from 'lucide-react';
import EmployeeNavbar from '../../components/EmployeeNavbar';
import { StatCard, SkillBadge, Spinner, RatingBar, Alert } from '../../components/UI';
import { employeeAPI, resumeAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert]     = useState(null);

  // Resume upload
  const [uploading, setUploading] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [showGap, setShowGap]     = useState(false);

  const load = () => {
    setLoading(true);
    employeeAPI.getDashboard(user.id)
      .then(r => setData(r.data))
      .catch(() => setAlert({ type: 'error', msg: 'Failed to load dashboard' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user.id]);

  const handleResumeUpload = async () => {
    if (!resumeFile) return;
    setUploading(true);
    setAlert(null);
    try {
      const fd = new FormData();
      fd.append('resume', resumeFile);
      fd.append('employee_id', user.id);
      const { data: parsed } = await resumeAPI.parse(fd);

      setAlert({ type: 'success', msg: `✅ Resume parsed! ${parsed.skills_saved} skills extracted and saved.` });
      setResumeFile(null);
      load(); // Reload dashboard with new skills
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.error || 'Failed to parse resume. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <EmployeeNavbar />
      <div className="flex items-center justify-center h-96"><Spinner size="lg" /></div>
    </div>
  );

  const emp      = data?.employee || {};
  const stats    = data?.stats || {};
  const gaps     = data?.skillGaps || [];
  const courseRecommendations = data?.courseRecommendations || [];
  const iviews   = data?.interviews || [];
  const skills   = emp.employee_skills || [];

  // Build radar data from skill scores (last interview)
  const lastIv = data?.lastInterview;
  const skillScores = lastIv?.skill_scores || {};
  const radarData = Object.entries(skillScores).slice(0, 6).map(([skill, score]) => ({
    subject: skill.length > 12 ? skill.slice(0, 12) + '…' : skill,
    score,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <EmployeeNavbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">
        {/* Welcome */}
        <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hi, {emp.name || user.name} 👋</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
              {emp.roles?.name && (
                <span className="flex items-center gap-1"><Briefcase size={14} />{emp.roles.name}</span>
              )}
              {emp.experience_years > 0 && <span>{emp.experience_years} yr experience</span>}
              {emp.managers?.name && <span>Manager: {emp.managers.name}</span>}
            </div>
          </div>
          {emp.rank && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2">
              🏆 Team Rank #{emp.rank}
            </div>
          )}
        </div>

        {alert && <div className="mb-4"><Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} /></div>}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Skills"         value={stats.totalSkills || 0}       icon={BookOpen}     color="blue" />
          <StatCard label="Overall Rating" value={`${stats.overallRating || 0}/10`} icon={Star}    color="orange" />
          <StatCard label="Interviews"     value={stats.completedInterviews || 0} icon={MessageSquare} color="green" />
          <StatCard label="Communication"  value={`${stats.communicationRating || 0}/10`} icon={TrendingUp} color="purple" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-5">
            {/* Resume upload card */}
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Upload size={18} className="text-blue-500" /> Upload Resume
              </h2>
              <p className="text-sm text-gray-500 mb-3">Upload your resume PDF to automatically extract and update your skills.</p>
              <div className="flex gap-3 flex-wrap">
                <label className="flex-1 cursor-pointer">
                  <div className={`border-2 border-dashed rounded-lg px-4 py-3 text-center transition-colors ${resumeFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}>
                    <span className="text-sm text-gray-500">{resumeFile ? resumeFile.name : 'Choose PDF file'}</span>
                  </div>
                  <input type="file" accept=".pdf,.txt" className="hidden"
                    onChange={e => setResumeFile(e.target.files[0])} />
                </label>
                <button onClick={handleResumeUpload} disabled={!resumeFile || uploading}
                  className="btn-primary flex items-center gap-2 whitespace-nowrap">
                  {uploading ? <><Spinner size="sm" /> Parsing…</> : 'Extract Skills'}
                </button>
              </div>
              {emp.resume_filename && (
                <p className="text-xs text-gray-400 mt-2">Last upload: {emp.resume_filename}</p>
              )}
            </div>

            {/* Skills */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">My Skills ({skills.length})</h2>
                <Link to="/employee/profile" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                  Manage <ArrowRight size={13} />
                </Link>
              </div>
              {skills.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No skills yet — upload your resume to get started</p>
              ) : (
                <div>
                  {/* Group by source */}
                  {['resume', 'interview', 'manual'].map(src => {
                    const srcSkills = skills.filter(s => s.source === src);
                    if (!srcSkills.length) return null;
                    return (
                      <div key={src} className="mb-3">
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 font-medium">{src}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {srcSkills.map(s => <SkillBadge key={s.id} skill_name={s.skill_name} proficiency={s.proficiency} />)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Skill Gaps */}
            {gaps.length > 0 && (
              <div className="card border-l-4 border-orange-400">
                <button
                  onClick={() => setShowGap(v => !v)}
                  className="flex items-center justify-between w-full"
                >
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-orange-500" />
                    Skill Gaps for {emp.roles?.name || 'Your Role'} ({gaps.length})
                  </h2>
                  <span className="text-gray-400 text-sm">{showGap ? '▲ Hide' : '▼ Show'}</span>
                </button>

                {showGap && (
                  <div className="mt-4 space-y-3">
                    {gaps.map(skill => (
                      <div key={skill} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-orange-800">{skill}</span>
                          <span className="text-xs bg-orange-200 text-orange-700 px-1.5 py-0.5 rounded">Missing</span>
                        </div>
                        <p className="text-xs text-orange-700">
                          Recommended courses are available below in the Course Recommendations section.
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Course Recommendations */}
            {courseRecommendations.length > 0 && (
              <div className="card border-l-4 border-blue-500">
                <h2 className="font-semibold text-gray-900 text-xl mb-1">Course Recommendations</h2>
                <p className="text-sm text-gray-500 mb-4">AI-powered suggestions to close every skill gap.</p>

                <div className="bg-blue-900 text-blue-50 text-sm px-4 py-3 rounded-lg mb-4">
                  Gap detected &gt; AI maps skill gaps &gt; Returns top courses &gt; You click to learn
                </div>

                <div className="space-y-3">
                  {courseRecommendations.map((item, index) => {
                    const accent = ['border-blue-500', 'border-teal-500', 'border-orange-500'][index % 3];
                    const courses = item.courses || [];
                    const topCourse = courses[0];
                    const gapScore = item.gap_score != null ? Number(item.gap_score).toFixed(1) : null;

                    return (
                      <div key={`${item.skill_name}-${index}`} className={`border-l-4 ${accent} bg-white border border-gray-200 rounded-lg p-4`}>
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs px-2.5 py-1 rounded-full border border-blue-300 text-blue-700 bg-blue-50 font-medium">
                                {item.skill_name}
                              </span>
                              {gapScore && (
                                <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700">
                                  Gap: {gapScore}
                                </span>
                              )}
                            </div>
                            {topCourse ? (
                              <>
                                <p className="text-lg font-semibold text-gray-900 mt-2">{topCourse.title}</p>
                                <p className="text-sm text-gray-600 mt-1">
                                  Platform: {topCourse.platform || 'Online'}{topCourse.price ? ` • ${topCourse.price}` : ''}
                                  {topCourse.rating ? ` • ★ ${topCourse.rating}` : ''}
                                </p>
                              </>
                            ) : (
                              <p className="text-sm text-gray-500 mt-2">No courses found for this skill yet.</p>
                            )}
                          </div>

                          {topCourse?.url && (
                            <a
                              href={topCourse.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white px-5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap"
                            >
                              Enroll <ExternalLink size={14} />
                            </a>
                          )}
                        </div>

                        {courses.length > 1 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {courses.slice(1).map((course, cIdx) => (
                              <a
                                key={`${course.title}-${cIdx}`}
                                href={course.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-700 hover:underline flex items-center gap-1"
                              >
                                <ExternalLink size={11} /> {course.title}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent interviews */}
            {iviews.length > 0 && (
              <div className="card">
                <h2 className="font-semibold text-gray-900 mb-3">Recent Interviews</h2>
                <div className="space-y-2">
                  {iviews.slice(0, 3).map(iv => (
                    <div key={iv.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">{new Date(iv.created_at).toLocaleDateString()}</span>
                        {iv.overall_score > 0 && <span className="text-blue-600 ml-2">Score: {iv.overall_score}/10</span>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        iv.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-600'
                      }`}>{iv.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Ratings */}
            {(stats.overallRating > 0 || stats.communicationRating > 0) && (
              <div className="card space-y-3">
                <h2 className="font-semibold text-gray-900">Performance</h2>
                <RatingBar label="Overall Rating"    value={stats.overallRating}      color="blue" />
                <RatingBar label="Communication"     value={stats.communicationRating} color="purple" />
              </div>
            )}

            {/* Radar chart */}
            {radarData.length >= 3 && (
              <div className="card">
                <h2 className="font-semibold text-gray-900 mb-3">Skill Radar</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Quick links */}
            <div className="card space-y-2">
              <h2 className="font-semibold text-gray-900 mb-2">Quick Actions</h2>
              {[
                { to: '/employee/interview', label: 'Take AI Interview', icon: MessageSquare, color: 'blue' },
                { to: '/employee/profile',   label: 'Update Profile',    icon: TrendingUp,   color: 'green' },
              ].map(({ to, label, icon: Icon, color }) => (
                <Link key={to} to={to}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-blue-50 hover:text-blue-700 transition-colors group">
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-700 group-hover:text-blue-700">
                    <Icon size={16} /> {label}
                  </span>
                  <ArrowRight size={14} className="text-gray-400 group-hover:text-blue-500" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
