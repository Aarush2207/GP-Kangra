import React, { useEffect, useState } from 'react';
import { Mail, Trash2, CheckCircle, AlertCircle, BookOpenCheck, Zap, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EmployeeNavbar from '../../components/EmployeeNavbar';
import { Spinner, Alert } from '../../components/UI';
import { messageAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';

const MESSAGE_TYPES = {
  interview_reminder: {
    icon: Zap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Interview Reminder',
  },
  course_suggestion: {
    icon: BookOpenCheck,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    label: 'Course Suggestion',
  },
  content_suggestion: {
    icon: AlertCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    label: 'Learning Resource',
  },
};

function normalizeMessage(message) {
  let parsedContent = message.content;
  if (typeof parsedContent === 'string') {
    try {
      parsedContent = JSON.parse(parsedContent);
    } catch {
      parsedContent = {};
    }
  }

  return {
    ...message,
    content: parsedContent || {},
  };
}

export default function EmployeeInbox() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [filter, setFilter] = useState('all'); // all, unread, interview_reminder, course_suggestion, content_suggestion
  const [expandedMessage, setExpandedMessage] = useState(null);

  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      try {
        const res = await messageAPI.getInbox(user.id);
        setMessages((res.data || []).map(normalizeMessage));
      } catch (err) {
        console.error('Load messages error:', err);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };
    loadMessages();
    // Refresh messages every 15 seconds
    const interval = setInterval(loadMessages, 15000);
    return () => clearInterval(interval);
  }, [user.id]);

  const handleMarkAsRead = async (messageId) => {
    try {
      await messageAPI.markAsRead(messageId, user.id);
      setMessages(prev =>
        prev.map(m => m.id === messageId ? { ...m, is_read: true, read_at: new Date().toISOString() } : m)
      );
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  };

  const handleDelete = async (messageId) => {
    if (!confirm('Delete this message?')) return;
    try {
      await messageAPI.delete(messageId, user.id);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      setAlert({ type: 'success', msg: 'Message deleted' });
    } catch (err) {
      console.error('Delete message error:', err);
    }
  };

  const handleStartInterview = (message) => {
    // Navigate to interview page
    navigate('/employee/interview', { state: { roleId: message.content?.role_id } });
  };

  // Filter messages
  const filteredMessages = messages.filter(m => {
    if (filter === 'unread') return !m.is_read;
    if (filter !== 'all') return m.message_type === filter;
    return true;
  });

  const unreadCount = messages.filter(m => !m.is_read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <EmployeeNavbar />
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <EmployeeNavbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-200 rounded-lg transition">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Mail size={28} className="text-blue-600" />
              My Inbox
            </h1>
            <p className="text-gray-500 text-sm mt-1">Messages from your manager</p>
          </div>
          {unreadCount > 0 && (
            <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
              {unreadCount} {unreadCount === 1 ? 'message' : 'messages'}
            </div>
          )}
        </div>

        {alert && <div className="mb-4"><Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} /></div>}

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          {['all', 'unread', 'interview_reminder', 'course_suggestion', 'content_suggestion'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300'
              }`}
            >
              {f === 'all'
                ? 'All'
                : f === 'unread'
                ? 'Unread'
                : MESSAGE_TYPES[f]?.label}
            </button>
          ))}
        </div>

        {/* Messages List */}
        {filteredMessages.length === 0 ? (
          <div className="card text-center py-12">
            <Mail size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No messages</h3>
            <p className="text-gray-500">
              {filter === 'all' ? 'You have no messages yet.' : 'No messages match this filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMessages.map(message => {
              const typeInfo = MESSAGE_TYPES[message.message_type] || MESSAGE_TYPES.content_suggestion;
              const Icon = typeInfo.icon;
              const isExpanded = expandedMessage === message.id;

              return (
                <div
                  key={message.id}
                  className={`card border-l-4 transition-all ${
                    typeInfo.borderColor
                  } ${!message.is_read ? 'bg-blue-50' : 'bg-white'}`}
                >
                  {/* Message Header */}
                  <div className="flex items-start gap-4 cursor-pointer" onClick={() => {
                    if (!message.is_read) handleMarkAsRead(message.id);
                    setExpandedMessage(isExpanded ? null : message.id);
                  }}>
                    <div className={`p-3 rounded-lg ${typeInfo.bgColor}`}>
                      <Icon size={24} className={typeInfo.color} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{message.title}</h3>
                        {!message.is_read && (
                          <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{message.description}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(message.created_at).toLocaleDateString()} -{' '}
                        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(message.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      {message.message_type === 'interview_reminder' && (
                        <div className="space-y-3">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Role:</strong> {message.content?.role_name}
                            </p>
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Deadline:</strong> {new Date(message.content?.deadline).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Days remaining:</strong> {message.content?.days_until_deadline} days
                            </p>
                          </div>
                          <button
                            onClick={() => handleStartInterview(message)}
                            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                          >
                            Start Interview
                          </button>
                        </div>
                      )}

                      {message.message_type === 'course_suggestion' && (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-gray-900">
                            Recommended Courses for <strong>{message.content?.skill_name}</strong>
                          </p>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {(message.content?.courses || []).map((course, idx) => (
                              <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:border-purple-300 transition">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <a
                                    href={course.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 font-medium text-purple-600 hover:underline truncate"
                                  >
                                    {course.title}
                                  </a>
                                </div>
                                <p className="text-xs text-gray-600 mb-1">
                                  {course.provider} • {course.duration}
                                  {course.rating && ` • ⭐ ${course.rating}/5`}
                                </p>
                                {course.price && <p className="text-xs font-semibold text-gray-700">{course.price}</p>}
                              </div>
                            ))}
                          </div>
                          <a
                            href={message.content?.courses?.[0]?.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium text-center rounded-lg transition-colors"
                          >
                            View All Courses
                          </a>
                        </div>
                      )}

                      {message.message_type === 'content_suggestion' && (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-gray-900">
                            Resources for <strong>{message.content?.skill_gap_name}</strong>
                          </p>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {(message.content?.resources || []).map((resource, idx) => (
                              <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:border-orange-300 transition">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <a
                                    href={resource.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 font-medium text-orange-600 hover:underline truncate"
                                  >
                                    {resource.title}
                                  </a>
                                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-medium whitespace-nowrap">
                                    {resource.type}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600">
                                  {resource.estimated_time && `⏱️ ${resource.estimated_time}`}
                                </p>
                                {resource.description && (
                                  <p className="text-xs text-gray-600 mt-1">{resource.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!message.is_read && (
                        <button
                          onClick={() => handleMarkAsRead(message.id)}
                          className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckCircle size={16} /> Mark as Read
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
