import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Briefcase, LogOut, Menu, X, Brain, BarChart3, Users2, MessageSquare
} from 'lucide-react';

const NAV = [
  { to: '/manager/dashboard',  label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/manager/employees',  label: 'Employees',      icon: Users },
  { to: '/manager/team',       label: 'Team',           icon: Users2 },
  { to: '/manager/roles',      label: 'Roles',          icon: Briefcase },
  { to: '/manager/interviews', label: 'Interview Log',  icon: BarChart3 },
  { to: '/manager/messaging',  label: 'Messages',       icon: MessageSquare },
];

export default function ManagerNavbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/manager/dashboard" className="flex items-center gap-2 font-bold text-blue-600 text-lg">
            <Brain size={24} />
            <span className="hidden sm:block">SkillSense</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === to
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </div>

          {/* User + logout */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-gray-500">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition-colors"
            >
              <LogOut size={16} />
              <span className="hidden sm:block">Logout</span>
            </button>
            <button className="md:hidden" onClick={() => setOpen(!open)}>
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-3 border-t border-gray-100 mt-2 pt-2 space-y-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                  location.pathname === to ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
