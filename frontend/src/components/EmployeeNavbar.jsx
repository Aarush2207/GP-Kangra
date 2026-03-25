import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, User, MessageSquare, LogOut, Menu, X, Brain, Mail } from 'lucide-react';
import { messageAPI } from '../api';

const NAV = [
  { to: '/employee/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/employee/profile',   label: 'Profile',   icon: User },
  { to: '/employee/interview', label: 'Interview',  icon: MessageSquare },
  { to: '/employee/inbox',     label: 'Inbox',     icon: Mail },
];

export default function EmployeeNavbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await messageAPI.getUnreadCount(user.id);
        setUnreadCount(res.data.unread_count || 0);
      } catch (err) {
        // Silently fail
      }
    };
    fetchUnread();
    // Fetch every 30 seconds
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user.id]);

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/employee/dashboard" className="flex items-center gap-2 font-bold text-blue-600 text-lg">
            <Brain size={24} />
            <span className="hidden sm:block">SkillSense</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                  location.pathname === to
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={16} />
                {label}
                {to === '/employee/inbox' && unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <span className="text-sm text-gray-500">{user?.name}</span>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500">
              <LogOut size={16} />
              <span className="hidden sm:block">Logout</span>
            </button>
            <button className="md:hidden" onClick={() => setOpen(!open)}>
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden pb-3 border-t border-gray-100 mt-2 pt-2 space-y-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} onClick={() => setOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                  location.pathname === to ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
                }`}
              >
                <Icon size={16} />{label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
