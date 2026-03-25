import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Briefcase,
  Star,
  MessageSquare,
  Download,
  FileText,
  AlertCircle,
  ClipboardList,
  ExternalLink,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import ManagerNavbar from '../../components/ManagerNavbar';
import { StatCard, Spinner, Alert } from '../../components/UI';
import { managerAPI, interviewAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [statsRes, empRes, interviewRes] = await Promise.all([
          managerAPI.getStats(user.id),
          managerAPI.getEmployees(user.id),
          interviewAPI.getForManager(user.id),
        ]);

        setStats(statsRes.data);
        setEmployees(empRes.data || []);
        setInterviews(interviewRes.data || []);
      } catch (err) {
        setAlert({ type: 'error', msg: 'Failed to load dashboard data' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ManagerNavbar />
        <div className="flex items-center justify-center h-96">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  const roleChartData = (stats?.roles || []).map((role) => ({
    name: role.name.length > 12 ? `${role.name.slice(0, 12)}...` : role.name,
    employees: role.employeeCount,
  }));

  const recentInterviews = [...interviews]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  const statusClasses = {
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    pending: 'bg-yellow-100 text-yellow-700',
  };

  const handleDownloadResume = (employee) => {
    if (!employee.resume_text) {
      setAlert({ type: 'warning', msg: `No resume available for ${employee.name}` });
      return;
    }

    const element = document.createElement('a');
    const file = new Blob([employee.resume_text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${employee.name}-resume.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setAlert({ type: 'success', msg: `Downloaded resume for ${employee.name}` });
  };

  const employeesWithResume = employees.filter((employee) => employee.resume_text);

  return (
    <div className="min-h-screen bg-gray-50">
      <ManagerNavbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name} 👋</h1>
          <p className="text-gray-500 text-sm mt-1">Here is what is happening with your team today.</p>
        </div>

        {alert && (
          <div className="mb-4">
            <Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} />
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Employees" value={stats?.totalEmployees ?? 0} icon={Users} color="blue" />
          <StatCard label="Roles Defined" value={stats?.totalRoles ?? 0} icon={Briefcase} color="purple" />
          <StatCard
            label="Interviews Done"
            value={stats?.completedInterviews ?? 0}
            icon={MessageSquare}
            color="green"
          />
          <StatCard label="Avg Rating" value={`${stats?.averageRating ?? 0}/10`} icon={Star} color="orange" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Employees per Role</h2>
            {roleChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={roleChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="employees" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                No roles created yet
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Role Distribution</h2>
            {roleChartData.some((role) => role.employees > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={roleChartData.filter((role) => role.employees > 0)}
                    dataKey="employees"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {roleChartData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                Assign employees to roles to see distribution
              </div>
            )}
          </div>
        </div>

        <div className="card mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList size={20} className="text-blue-600" />
              <h2 className="font-semibold text-gray-900">Recent Interview Log</h2>
            </div>
            <Link
              to="/manager/interviews"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View full log
              <ExternalLink size={14} />
            </Link>
          </div>

          {recentInterviews.length === 0 ? (
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle size={18} className="text-blue-500 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                No interview logs yet. Completed and cancelled interviews will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-700 font-semibold">Employee</th>
                    <th className="px-4 py-3 text-left text-gray-700 font-semibold">Role</th>
                    <th className="px-4 py-3 text-center text-gray-700 font-semibold">Status</th>
                    <th className="px-4 py-3 text-center text-gray-700 font-semibold">Score</th>
                    <th className="px-4 py-3 text-left text-gray-700 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInterviews.map((interview) => {
                    const overallScore = interview.ai_evaluation?.overall_score;

                    return (
                      <tr key={interview.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{interview.employee?.name || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{interview.role?.name || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                              statusClasses[interview.status] || 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {interview.status || 'unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700">
                          {typeof overallScore === 'number' ? `${overallScore}/10` : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {new Date(interview.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={20} className="text-blue-600" />
            Resume Library
          </h2>
          {employeesWithResume.length === 0 ? (
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle size={18} className="text-blue-500 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                No resumes uploaded yet. Employees can upload resumes in their profile.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-700 font-semibold">Employee</th>
                    <th className="px-4 py-3 text-left text-gray-700 font-semibold">Role</th>
                    <th className="px-4 py-3 text-left text-gray-700 font-semibold">Experience</th>
                    <th className="px-4 py-3 text-center text-gray-700 font-semibold">Rating</th>
                    <th className="px-4 py-3 text-center text-gray-700 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {employeesWithResume.map((employee) => (
                    <tr key={employee.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{employee.name}</td>
                      <td className="px-4 py-3 text-gray-600">{employee.roles?.name || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{employee.experience_years || 0} years</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block px-2.5 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                          {employee.overall_rating || 0}/10
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDownloadResume(employee)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                        >
                          <Download size={14} />
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
