import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LandingPage       from './pages/LandingPage';
import ManagerLogin      from './pages/ManagerLogin';
import EmployeeLogin     from './pages/EmployeeLogin';
import EmployeeRegister  from './pages/EmployeeRegister';

// Manager pages
import ManagerDashboard  from './pages/manager/ManagerDashboard';
import EmployeesPage     from './pages/manager/EmployeesPage';
import EmployeeDetailPage from './pages/manager/EmployeeDetailPage';
import RolesPage         from './pages/RolesPage';
import AIInterviewPage   from './pages/manager/AIInterviewPage';
import InterviewLog      from './pages/manager/InterviewLog';
import TeamPage          from './pages/manager/TeamPage';
import ManagerMessaging  from './pages/manager/ManagerMessaging';

// Employee pages
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import EmployeeProfile   from './pages/employee/EmployeeProfile';
import EmployeeInterview from './pages/employee/EmployeeInterview';
import EmployeeInbox     from './pages/employee/EmployeeInbox';

// Guards
function ManagerRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== 'manager') return <Navigate to="/employee/dashboard" replace />;
  return children;
}

function EmployeeRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== 'employee') return <Navigate to="/manager/dashboard" replace />;
  return children;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <LandingPage />;
  if (user.role === 'manager') return <Navigate to="/manager/dashboard" replace />;
  return <Navigate to="/employee/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public */}
          <Route path="/"                  element={<HomeRedirect />} />
          <Route path="/login"             element={<LandingPage />} />
          <Route path="/login/manager"     element={<ManagerLogin />} />
          <Route path="/login/employee"    element={<EmployeeLogin />} />
          <Route path="/register/employee" element={<EmployeeRegister />} />

          {/* Manager */}
          <Route path="/manager/dashboard"  element={<ManagerRoute><ManagerDashboard /></ManagerRoute>} />
          <Route path="/manager/employees"  element={<ManagerRoute><EmployeesPage /></ManagerRoute>} />
          <Route path="/manager/employees/:employeeId" element={<ManagerRoute><EmployeeDetailPage /></ManagerRoute>} />
          <Route path="/manager/team"       element={<ManagerRoute><TeamPage /></ManagerRoute>} />
          <Route path="/manager/roles"      element={<ManagerRoute><RolesPage /></ManagerRoute>} />
          <Route path="/manager/interview"  element={<ManagerRoute><AIInterviewPage /></ManagerRoute>} />
          <Route path="/manager/interviews" element={<ManagerRoute><InterviewLog /></ManagerRoute>} />
          <Route path="/manager/messaging"  element={<ManagerRoute><ManagerMessaging /></ManagerRoute>} />

          {/* Employee */}
          <Route path="/employee/dashboard" element={<EmployeeRoute><EmployeeDashboard /></EmployeeRoute>} />
          <Route path="/employee/profile"   element={<EmployeeRoute><EmployeeProfile /></EmployeeRoute>} />
          <Route path="/employee/interview" element={<EmployeeRoute><EmployeeInterview /></EmployeeRoute>} />
          <Route path="/employee/inbox"     element={<EmployeeRoute><EmployeeInbox /></EmployeeRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
