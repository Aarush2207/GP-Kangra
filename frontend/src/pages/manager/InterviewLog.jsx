import React, { useEffect, useState } from 'react';
import { ArrowLeft, BarChart3, TrendingUp, Zap, AlertCircle, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ScatterChart, Scatter } from 'recharts';
import ManagerNavbar from '../../components/ManagerNavbar';
import { Spinner, Alert } from '../../components/UI';
import { interviewAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function InterviewLog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState([]);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await interviewAPI.getForManager(user.id);
        setInterviews(data || []);
      } catch (err) {
        setAlert({ type: 'error', msg: 'Failed to load interviews' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.id]);

  const handleDeleteInterview = (interviewId) => {
    if (!confirm('Delete this interview record? This action cannot be undone.')) return;
    try {
      setInterviews(prev => prev.filter(i => i.id !== interviewId));
      setAlert({ type: 'success', msg: 'Interview deleted successfully' });
    } catch (err) {
      setAlert({ type: 'error', msg: 'Failed to delete interview' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ManagerNavbar />
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      </div>
    );
  }

  // Data processing
  const completedInterviews = interviews.filter(i => i.status === 'completed');

  const scoreDistribution = completedInterviews.reduce((acc, interview) => {
    const score = Math.floor((interview.ai_evaluation?.overall_score || 0) / 10) * 10;
    const existing = acc.find(a => a.range === `${score}-${score + 10}`);
    if (existing) existing.count++;
    else acc.push({ range: `${score}-${score + 10}`, count: 1 });
    return acc;
  }, []);

  const timelineData = completedInterviews
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-7)
    .map(i => ({
      date: new Date(i.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      avgScore: i.ai_evaluation?.overall_score || 0,
      communication: i.ai_evaluation?.communication_score || 0,
    }));

  const skillScoresData = completedInterviews
    .flatMap(i => Object.entries(i.ai_evaluation?.skill_scores || {}))
    .reduce((acc, [skill, score]) => {
      const existing = acc.find(a => a.skill === skill);
      if (existing) {
        existing.avgScore = (existing.avgScore + score) / 2;
      } else {
        acc.push({ skill: skill.length > 15 ? skill.slice(0, 15) + '…' : skill, avgScore: score });
      }
      return acc;
    }, []);

  const performanceScatterData = completedInterviews.map(i => ({
    overallScore: i.ai_evaluation?.overall_score || 0,
    communication: i.ai_evaluation?.communication_score || 0,
    name: i.employee?.name || 'Unknown',
  }));

  const avgOverall = completedInterviews.length > 0
    ? (completedInterviews.reduce((sum, i) => sum + (i.ai_evaluation?.overall_score || 0), 0) / completedInterviews.length).toFixed(1)
    : 0;

  const avgCommunication = completedInterviews.length > 0
    ? (completedInterviews.reduce((sum, i) => sum + (i.ai_evaluation?.communication_score || 0), 0) / completedInterviews.length).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <ManagerNavbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">
        {/* Header */}
        <button onClick={() => navigate('/manager/dashboard')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 font-medium">
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 size={28} className="text-blue-600" />
            Interview Log & Performance Analytics
          </h1>
          <p className="text-gray-500 text-sm mt-2">Comprehensive interview data and skill assessment insights</p>
        </div>

        {alert && <div className="mb-4"><Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} /></div>}

        {completedInterviews.length === 0 ? (
          <div className="card text-center py-12">
            <AlertCircle size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No interviews yet</h3>
            <p className="text-gray-500">Run employee interviews to see analytics here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Total Interviews</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{completedInterviews.length}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <BarChart3 size={18} />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Avg Overall Score</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{avgOverall}/10</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                    <TrendingUp size={18} />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Avg Communication</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{avgCommunication}/10</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Zap size={18} />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Pass Rate</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {completedInterviews.length > 0
                        ? Math.round((completedInterviews.filter(i => (i.ai_evaluation?.overall_score || 0) >= 7).length / completedInterviews.length) * 100)
                        : 0}%
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                    <AlertCircle size={18} />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Score Timeline */}
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4">Interview Trends (Last 7)</h3>
                {timelineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} domain={[0, 10]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="avgScore" stroke="#3b82f6" name="Overall Score" strokeWidth={2} />
                      <Line type="monotone" dataKey="communication" stroke="#8b5cf6" name="Communication" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>
                )}
              </div>

              {/* Score Distribution */}
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4">Score Distribution</h3>
                {scoreDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={scoreDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#10b981" name="Interviews" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>
                )}
              </div>
            </div>

            {/* Skill Strength Radar & Scatter */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Skills */}
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4">Top Skills Assessment</h3>
                {skillScoresData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={skillScoresData.slice(0, 6)}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 10 }} />
                      <Radar name="Avg Score" dataKey="avgScore" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-400">No skill data available</div>
                )}
              </div>

              {/* Performance Scatter */}
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4">Overall vs Communication Score</h3>
                {performanceScatterData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="overallScore" name="Overall Score" domain={[0, 10]} label={{ value: 'Overall Score', position: 'insideBottomRight', offset: -5 }} />
                      <YAxis dataKey="communication" name="Communication" domain={[0, 10]} label={{ value: 'Communication', angle: -90, position: 'insideLeft' }} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
                        if (!payload || !payload[0]) return null;
                        const data = payload[0].payload;
                        return <div className="bg-white p-2 border border-gray-200 rounded text-sm"><p>{data.name}</p></div>;
                      }} />
                      <Scatter name="Employees" data={performanceScatterData} fill="#3b82f6" />
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>
                )}
              </div>
            </div>

            {/* Recent Interviews Table */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Recent Interview Results</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-gray-700 font-semibold">Employee</th>
                      <th className="px-4 py-3 text-left text-gray-700 font-semibold">Role</th>
                      <th className="px-4 py-3 text-center text-gray-700 font-semibold">Overall Score</th>
                      <th className="px-4 py-3 text-center text-gray-700 font-semibold">Communication</th>
                      <th className="px-4 py-3 text-left text-gray-700 font-semibold">Date</th>
                      <th className="px-4 py-3 text-center text-gray-700 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedInterviews.slice(-10).reverse().map(interview => (
                      <tr key={interview.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{interview.employee?.name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{interview.role?.name || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                            {interview.ai_evaluation?.overall_score || 0}/10
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                            {interview.ai_evaluation?.communication_score || 0}/10
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {new Date(interview.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => handleDeleteInterview(interview.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-colors">
                            <Trash2 size={13} />
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
