import React, { useEffect, useState } from 'react';
import { Send, Search, Plus, X, Loader, Clock3 } from 'lucide-react';
import ManagerNavbar from '../../components/ManagerNavbar';
import { Spinner, Alert } from '../../components/UI';
import { messageAPI, managerAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function ManagerMessaging() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('reminder'); // reminder, course, content
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSent, setLoadingSent] = useState(false);
  const [alert, setAlert] = useState(null);
  const [sending, setSending] = useState(false);
  const [sentMessages, setSentMessages] = useState([]);

  // Tab states
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [interviewType, setInterviewType] = useState('skill_assessment');
  const [customMessage, setCustomMessage] = useState('');

  // Course tab states
  const [courseSkillGap, setCourseSkillGap] = useState('');
  const [courses, setCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [searchingCourses, setSearchingCourses] = useState(false);

  // Content tab states
  const [contentSkillGap, setContentSkillGap] = useState('');
  const [resources, setResources] = useState([]);
  const [newResource, setNewResource] = useState({ title: '', link: '', type: 'article', estimated_time: '', description: '' });

  const loadSentMessages = async () => {
    setLoadingSent(true);
    try {
      const sentRes = await messageAPI.getManagerSent(user.id, 20);
      setSentMessages(sentRes.data || []);
    } catch (err) {
      setAlert({ type: 'warning', msg: 'Messages were sent, but history failed to load.' });
    } finally {
      setLoadingSent(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [employeeRes, sentRes] = await Promise.allSettled([
          managerAPI.getEmployees(user.id),
          messageAPI.getManagerSent(user.id, 20),
        ]);

        if (employeeRes.status === 'fulfilled') {
          setEmployees(employeeRes.value.data || []);
        } else {
          console.error('Load employees error:', employeeRes.reason);
          setEmployees([]);
        }

        if (sentRes.status === 'fulfilled') {
          setSentMessages(sentRes.value.data || []);
        } else {
          console.error('Load sent messages error:', sentRes.reason);
          setSentMessages([]);
        }

        if (employeeRes.status === 'rejected' && sentRes.status === 'rejected') {
          setAlert({ type: 'error', msg: 'Failed to load messaging data' });
        }
      } catch (err) {
        setAlert({ type: 'error', msg: 'Failed to load messaging data' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.id]);

  const handleEmployeeToggle = (empId) => {
    setSelectedEmployees(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedEmployees([]);
      setSelectAll(false);
    } else {
      setSelectedEmployees(employees.map(e => e.id));
      setSelectAll(true);
    }
  };

  const handleSendReminder = async () => {
    if (selectedEmployees.length === 0) {
      setAlert({ type: 'warning', msg: 'Please select at least one employee' });
      return;
    }
    if (!deadline) {
      setAlert({ type: 'warning', msg: 'Please set a deadline' });
      return;
    }

    setSending(true);
    try {
      const res = await messageAPI.sendReminder({
        manager_id: user.id,
        employee_ids: selectedEmployees,
        deadline,
        interview_type: interviewType,
        custom_message: customMessage,
      });
      setAlert({ type: 'success', msg: `Reminder sent to ${res.data.created} employee(s)` });
      // Reset
      setSelectedEmployees([]);
      setSelectAll(false);
      setDeadline('');
      setCustomMessage('');
      loadSentMessages();
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.error || 'Failed to send reminders' });
    } finally {
      setSending(false);
    }
  };

  const handleSearchCourses = async () => {
    if (!courseSkillGap) {
      setAlert({ type: 'warning', msg: 'Please enter a skill' });
      return;
    }
    setSearchingCourses(true);
    try {
      const res = await messageAPI.searchCourses(courseSkillGap, 10);
      setCourses(res.data.courses || []);
      setSelectedCourses([]);
    } catch (err) {
      setAlert({ type: 'error', msg: 'Failed to search courses' });
    } finally {
      setSearchingCourses(false);
    }
  };

  const handleSendCourse = async () => {
    if (selectedEmployees.length === 0) {
      setAlert({ type: 'warning', msg: 'Please select at least one employee' });
      return;
    }
    if (!courseSkillGap) {
      setAlert({ type: 'warning', msg: 'Please select a skill' });
      return;
    }

    const coursesToSend = courses.filter((_, idx) => selectedCourses.includes(idx));
    if (coursesToSend.length === 0) {
      setAlert({ type: 'warning', msg: 'Please select at least one course' });
      return;
    }

    setSending(true);
    try {
      const res = await messageAPI.sendCourseSuggestion({
        manager_id: user.id,
        employee_ids: selectedEmployees,
        skill_name: courseSkillGap,
        custom_message: customMessage,
      });
      setAlert({ type: 'success', msg: `Courses sent to ${res.data.created} employee(s)` });
      setSelectedEmployees([]);
      setSelectAll(false);
      setCourseSkillGap('');
      setCourses([]);
      setSelectedCourses([]);
      setCustomMessage('');
      loadSentMessages();
    } catch (err) {
      setAlert({ type: 'error', msg: 'Failed to send courses' });
    } finally {
      setSending(false);
    }
  };

  const handleAddResource = () => {
    if (!newResource.title || !newResource.link) {
      setAlert({ type: 'warning', msg: 'Title and link are required' });
      return;
    }
    setResources([...resources, { ...newResource, id: Date.now() }]);
    setNewResource({ title: '', link: '', type: 'article', estimated_time: '', description: '' });
  };

  const handleSendContent = async () => {
    if (selectedEmployees.length === 0) {
      setAlert({ type: 'warning', msg: 'Please select at least one employee' });
      return;
    }
    if (!contentSkillGap) {
      setAlert({ type: 'warning', msg: 'Please select a skill gap' });
      return;
    }
    if (resources.length === 0) {
      setAlert({ type: 'warning', msg: 'Please add at least one resource' });
      return;
    }

    setSending(true);
    try {
      const res = await messageAPI.sendContentSuggestion({
        manager_id: user.id,
        employee_ids: selectedEmployees,
        skill_gap_name: contentSkillGap,
        gap_type: 'required',
        resources,
        custom_message: customMessage,
      });
      setAlert({ type: 'success', msg: `Content sent to ${res.data.created} employee(s)` });
      setSelectedEmployees([]);
      setSelectAll(false);
      setContentSkillGap('');
      setResources([]);
      setCustomMessage('');
      loadSentMessages();
    } catch (err) {
      setAlert({ type: 'error', msg: 'Failed to send content' });
    } finally {
      setSending(false);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <ManagerNavbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Send Messages to Employees</h1>
          <p className="text-gray-500 text-sm mt-1">Send interview reminders, course suggestions, or learning resources</p>
        </div>

        {alert && <div className="mb-4"><Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} /></div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Employee Selection - Left Grid */}
          <div className="lg:col-span-1 card">
            <h2 className="font-semibold text-gray-900 mb-4">Select Employees</h2>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              <label className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Select All</span>
              </label>
              {employees.map(emp => (
                <label key={emp.id} className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(emp.id)}
                    onChange={() => handleEmployeeToggle(emp.id)}
                    className="w-4 h-4 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{emp.name}</p>
                    <p className="text-xs text-gray-500">{emp.roles?.name || 'No role'}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700 font-medium">{selectedEmployees.length} selected</p>
            </div>
          </div>

          {/* Message Forms - Right Grid */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200">
              {[
                { id: 'reminder', label: 'Interview Reminder' },
                { id: 'course', label: 'Course Suggestion' },
                { id: 'content', label: 'Learning Resources' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Interview Reminder Tab */}
            {activeTab === 'reminder' && (
              <div className="card space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interview Type</label>
                  <select
                    value={interviewType}
                    onChange={e => setInterviewType(e.target.value)}
                    className="input"
                  >
                    <option value="skill_assessment">Skill Assessment</option>
                    <option value="role_practice">Role Practice</option>
                    <option value="skill_focus">Skill Focus</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline *</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Message (optional)</label>
                  <textarea
                    value={customMessage}
                    onChange={e => setCustomMessage(e.target.value)}
                    placeholder="Add a personal message..."
                    className="input h-20 resize-none"
                  />
                </div>

                <button
                  onClick={handleSendReminder}
                  disabled={sending || selectedEmployees.length === 0}
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {sending ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
                  {sending ? 'Sending...' : `Send to ${selectedEmployees.length} employee(s)`}
                </button>
              </div>
            )}

            {/* Course Suggestion Tab */}
            {activeTab === 'course' && (
              <div className="card space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={courseSkillGap}
                    onChange={e => setCourseSkillGap(e.target.value)}
                    placeholder="Enter skill (e.g., Python, React, Docker)"
                    className="input flex-1"
                  />
                  <button
                    onClick={handleSearchCourses}
                    disabled={searchingCourses}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    {searchingCourses ? <Loader size={18} className="animate-spin" /> : <Search size={18} />}
                    Search
                  </button>
                </div>

                {courses.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {courses.map((course, idx) => (
                      <label key={idx} className="flex items-start gap-3 p-2 hover:bg-gray-100 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCourses.includes(idx)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedCourses([...selectedCourses, idx]);
                            } else {
                              setSelectedCourses(selectedCourses.filter(i => i !== idx));
                            }
                          }}
                          className="w-4 h-4 mt-1 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{course.title}</p>
                          <p className="text-xs text-gray-600">
                            {course.provider} • {course.duration}
                            {course.rating && ` • ⭐ ${course.rating}/5`}
                          </p>
                          <p className="text-xs font-semibold text-gray-700 mt-0.5">{course.price}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Message (optional)</label>
                  <textarea
                    value={customMessage}
                    onChange={e => setCustomMessage(e.target.value)}
                    placeholder="Add a personal note..."
                    className="input h-20 resize-none"
                  />
                </div>

                <button
                  onClick={handleSendCourse}
                  disabled={sending || selectedEmployees.length === 0 || selectedCourses.length === 0}
                  className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {sending ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
                  {sending ? 'Sending...' : `Send to ${selectedEmployees.length} employee(s)`}
                </button>
              </div>
            )}

            {/* Learning Resources Tab */}
            {activeTab === 'content' && (
              <div className="card space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Skill Gap</label>
                  <input
                    type="text"
                    value={contentSkillGap}
                    onChange={e => setContentSkillGap(e.target.value)}
                    placeholder="e.g., Python, Docker, AWS"
                    className="input"
                  />
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Add Resources</h4>
                  <div className="space-y-2 mb-3">
                    <input
                      type="text"
                      value={newResource.title}
                      onChange={e => setNewResource({ ...newResource, title: e.target.value })}
                      placeholder="Resource title"
                      className="input text-sm"
                    />
                    <input
                      type="url"
                      value={newResource.link}
                      onChange={e => setNewResource({ ...newResource, link: e.target.value })}
                      placeholder="Link"
                      className="input text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={newResource.type}
                        onChange={e => setNewResource({ ...newResource, type: e.target.value })}
                        className="input text-sm"
                      >
                        <option value="article">Article</option>
                        <option value="video">Video</option>
                        <option value="tutorial">Tutorial</option>
                        <option value="documentation">Documentation</option>
                      </select>
                      <input
                        type="text"
                        value={newResource.estimated_time}
                        onChange={e => setNewResource({ ...newResource, estimated_time: e.target.value })}
                        placeholder="Duration (e.g., 2h)"
                        className="input text-sm"
                      />
                    </div>
                    <textarea
                      value={newResource.description}
                      onChange={e => setNewResource({ ...newResource, description: e.target.value })}
                      placeholder="Description (optional)"
                      className="input text-sm h-16 resize-none"
                    />
                    <button
                      onClick={handleAddResource}
                      className="w-full py-2 px-4 bg-orange-100 hover:bg-orange-200 text-orange-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus size={16} /> Add Resource
                    </button>
                  </div>
                </div>

                {resources.length > 0 && (
                  <div className="space-y-2 border-t pt-4">
                    <p className="text-sm font-medium text-gray-700">{resources.length} resource(s) added</p>
                    {resources.map(resource => (
                      <div key={resource.id} className="bg-gray-50 p-3 rounded-lg flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{resource.title}</p>
                          <p className="text-xs text-gray-600">{resource.type} {resource.estimated_time && `• ${resource.estimated_time}`}</p>
                        </div>
                        <button
                          onClick={() => setResources(resources.filter(r => r.id !== resource.id))}
                          className="p-1 hover:bg-red-100 rounded text-red-600"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Message (optional)</label>
                  <textarea
                    value={customMessage}
                    onChange={e => setCustomMessage(e.target.value)}
                    placeholder="Add a personal note..."
                    className="input h-20 resize-none"
                  />
                </div>

                <button
                  onClick={handleSendContent}
                  disabled={sending || selectedEmployees.length === 0 || resources.length === 0}
                  className="w-full py-2 px-4 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {sending ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
                  {sending ? 'Sending...' : `Send to ${selectedEmployees.length} employee(s)`}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="card mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock3 size={18} className="text-gray-500" />
              Recent Sent Messages
            </h2>
            {loadingSent && <span className="text-xs text-gray-500">Refreshing...</span>}
          </div>

          {sentMessages.length === 0 ? (
            <p className="text-sm text-gray-500">No sent messages yet.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {sentMessages.map((message) => (
                <div key={message.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900 truncate">{message.title}</p>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(message.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    To: {message.employees?.name || message.employee_id}
                  </p>
                  {message.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{message.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
