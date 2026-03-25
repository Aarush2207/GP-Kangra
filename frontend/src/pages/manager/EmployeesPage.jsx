import React, { useEffect, useState } from 'react';
import { Users, Plus, Trash2, Edit2, Search, ChevronDown, X, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ManagerNavbar from '../../components/ManagerNavbar';
import { StatCard, SkillBadge, Spinner, EmptyState, Alert, Modal } from '../../components/UI';
import { managerAPI, rolesAPI, authAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function EmployeesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [alert, setAlert]         = useState(null);

  // Add employee modal
  const [showAdd, setShowAdd]     = useState(false);
  const [addForm, setAddForm]     = useState({ name:'', email:'', password:'', phone:'', experience_years:'', role_id:'' });
  const [addLoading, setAddLoading] = useState(false);

  // Role change modal
  const [roleModal, setRoleModal] = useState(null); // { employee }
  const [newRoleId, setNewRoleId] = useState('');
  const [roleLoading, setRoleLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [empRes, roleRes] = await Promise.all([
        managerAPI.getEmployees(user.id),
        rolesAPI.getAll({ manager_id: user.id }),
      ]);
      setEmployees(empRes.data || []);
      setRoles(roleRes.data || []);
    } catch (e) {
      setAlert({ type: 'error', msg: 'Failed to load employees' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      await authAPI.employeeRegister({
        ...addForm,
        experience_years: parseFloat(addForm.experience_years) || 0,
        manager_id: user.id,
        role_id: addForm.role_id || null,
      });
      setShowAdd(false);
      setAddForm({ name:'', email:'', password:'', phone:'', experience_years:'', role_id:'' });
      setAlert({ type: 'success', msg: 'Employee added successfully' });
      load();
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.error || 'Failed to add employee' });
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (empId) => {
    if (!confirm('Delete this employee? This cannot be undone.')) return;
    try {
      await managerAPI.deleteEmployee(user.id, empId);
      setEmployees(prev => prev.filter(e => e.id !== empId));
      setAlert({ type: 'success', msg: 'Employee deleted' });
    } catch {
      setAlert({ type: 'error', msg: 'Failed to delete employee' });
    }
  };

  const handleRoleChange = async () => {
    if (!roleModal) return;
    setRoleLoading(true);
    try {
      const { data } = await managerAPI.updateRole(user.id, roleModal.employee.id, newRoleId || null);
      setEmployees(prev => prev.map(e => e.id === roleModal.employee.id ? data.employee : e));
      setRoleModal(null);
      setAlert({ type: 'success', msg: 'Role updated successfully' });
    } catch {
      setAlert({ type: 'error', msg: 'Failed to update role' });
    } finally {
      setRoleLoading(false);
    }
  };

  const filtered = employees.filter(e => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase());
    const matchRole   = !filterRole || e.role_id === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <ManagerNavbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
            <p className="text-gray-500 text-sm mt-1">{employees.length} total employee{employees.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Employee
          </button>
        </div>

        {alert && <div className="mb-4"><Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} /></div>}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="Search by name or email…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input sm:w-48" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">All Roles</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <EmptyState icon={Users} title="No employees found"
              description={search ? 'Try adjusting your search' : 'Add your first employee to get started'}
              action={!search && <button onClick={() => setShowAdd(true)} className="btn-primary">Add Employee</button>}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(emp => (
              <div key={emp.id} className="card p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {emp.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{emp.name}</h3>
                        {emp.rank && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                            #{emp.rank}
                          </span>
                        )}
                        {emp.overall_rating > 0 && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                            ⭐ {emp.overall_rating}/10
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{emp.email}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {/* Role badge */}
                        <button
                          onClick={() => { setRoleModal({ employee: emp }); setNewRoleId(emp.role_id || ''); }}
                          className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-2.5 py-1 rounded-full transition-colors"
                        >
                          {emp.roles?.name || 'No role assigned'}
                          <ChevronDown size={12} />
                        </button>
                        <span className="text-xs text-gray-400">{emp.experience_years || 0} yr exp</span>
                      </div>
                      {/* Skills */}
                      {(emp.employee_skills || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(emp.employee_skills || []).slice(0, 6).map(s => (
                            <SkillBadge key={s.id} skill_name={s.skill_name} proficiency={s.proficiency} />
                          ))}
                          {(emp.employee_skills || []).length > 6 && (
                            <span className="text-xs text-gray-400 self-center">+{(emp.employee_skills || []).length - 6} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => navigate(`/manager/employees/${emp.id}`)}
                      className="text-gray-400 hover:text-blue-500 transition-colors p-1" title="View details">
                      <Eye size={16} />
                    </button>
                    <button onClick={() => handleDelete(emp.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add Employee Modal ── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Employee">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input className="input" placeholder="Jane Smith" value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" className="input" placeholder="jane@company.com" value={addForm.email}
                onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input type="password" className="input" placeholder="Min 6 chars" value={addForm.password}
                onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input className="input" placeholder="+1234567890" value={addForm.phone}
                onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Experience (yrs)</label>
              <input type="number" className="input" placeholder="0" min="0" value={addForm.experience_years}
                onChange={e => setAddForm(f => ({ ...f, experience_years: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign Role</label>
              <select className="input" value={addForm.role_id} onChange={e => setAddForm(f => ({ ...f, role_id: e.target.value }))}>
                <option value="">No role yet</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={addLoading}>
              {addLoading ? 'Adding…' : 'Add Employee'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Change Role Modal ── */}
      <Modal open={!!roleModal} onClose={() => setRoleModal(null)} title="Change Employee Role" size="sm">
        {roleModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Changing role for <strong>{roleModal.employee.name}</strong>
            </p>
            <select className="input" value={newRoleId} onChange={e => setNewRoleId(e.target.value)}>
              <option value="">— Remove role assignment —</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setRoleModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleRoleChange} className="btn-primary" disabled={roleLoading}>
                {roleLoading ? 'Saving…' : 'Save Change'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
