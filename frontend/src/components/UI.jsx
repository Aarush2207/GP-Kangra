import React from 'react';

// ── Skill Badge ───────────────────────────────────────────────
const PROFICIENCY_COLORS = {
  expert:       'bg-purple-100 text-purple-700 border-purple-200',
  advanced:     'bg-blue-100 text-blue-700 border-blue-200',
  intermediate: 'bg-green-100 text-green-700 border-green-200',
  beginner:     'bg-yellow-100 text-yellow-700 border-yellow-200',
};

export function SkillBadge({ skill_name, proficiency = 'intermediate', onRemove }) {
  const color = PROFICIENCY_COLORS[proficiency] || PROFICIENCY_COLORS.intermediate;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${color}`}>
      {skill_name}
      {onRemove && (
        <button onClick={onRemove} className="ml-1 hover:opacity-70 font-bold">×</button>
      )}
    </span>
  );
}

// ── Stat Card ─────────────────────────────────────────────────
export function StatCard({ label, value, icon: Icon, color = 'blue', subtitle }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    red:    'bg-red-50 text-red-600',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-2 rounded-lg ${colors[color] || colors.blue}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Loading Spinner ───────────────────────────────────────────
export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div className={`animate-spin rounded-full border-2 border-gray-200 border-t-blue-600 ${sizes[size]} ${className}`} />
  );
}

// ── Alert ─────────────────────────────────────────────────────
export function Alert({ type = 'info', message, onClose }) {
  if (!message) return null;
  const styles = {
    info:    'bg-blue-50 text-blue-700 border-blue-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    error:   'bg-red-50 text-red-700 border-red-200',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  };
  return (
    <div className={`flex items-start justify-between gap-3 px-4 py-3 rounded-lg border text-sm ${styles[type]}`}>
      <span>{message}</span>
      {onClose && <button onClick={onClose} className="font-bold opacity-70 hover:opacity-100">×</button>}
    </div>
  );
}

// ── Rating Bar ────────────────────────────────────────────────
export function RatingBar({ label, value, max = 10, color = 'blue' }) {
  const pct = Math.min((value / max) * 100, 100);
  const colors = {
    blue:   'bg-blue-500',
    green:  'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  };
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-600">
        <span>{label}</span>
        <span className="font-semibold">{value}/{max}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${colors[color] || colors.blue}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-12">
      {Icon && <Icon size={40} className="mx-auto text-gray-300 mb-3" />}
      <h3 className="text-gray-700 font-medium">{title}</h3>
      {description && <p className="text-gray-400 text-sm mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className={`bg-white rounded-xl shadow-xl w-full ${widths[size]} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
