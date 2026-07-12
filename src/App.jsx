import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DriverDashboard from './components/DriverDashboard'

// ---- FLEET & CORE FINANCE PAGES ----
import Motorcycles from './pages/Motorcycles'
import Drivers from './pages/Drivers'
import Assignments from './pages/Assignments'
import Collections from './pages/Collections'
import Debts from './pages/Debts'
import Expenses from './pages/Expenses'
import SavingsGoals from './pages/SavingsGoals'

// ---- COMPLIANCE & SYSTEM PAGES ----
import Reminders from './pages/Reminders'
import Insurance from './pages/Insurance'
import Tax from './pages/Tax'
import Inspections from './pages/Inspections'
import Documents from './pages/Documents'
import NonWorkingDays from './pages/NonWorkingDays'
import ActivityLog from './pages/ActivityLog'
import Settings from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public & Driver routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/driver" element={
            <ProtectedRoute>
              <DriverDashboard />
            </ProtectedRoute>
          } />

          {/* Admin Platform Layout Framework */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            
            {/* Fleet Section */}
            <Route path="motorcycles" element={<Motorcycles />} />
            <Route path="drivers" element={<Drivers />} />
            <Route path="assignments" element={<Assignments />} />
            
            {/* Money Section */}
            <Route path="collections" element={<Collections />} />
            <Route path="debts" element={<Debts />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="savings" element={<SavingsGoals />} />
            
            {/* Compliance Section */}
            <Route path="reminders" element={<Reminders />} />
            <Route path="insurance" element={<Insurance />} />
            <Route path="tax" element={<Tax />} />
            <Route path="inspections" element={<Inspections />} />
            <Route path="documents" element={<Documents />} />
            <Route path="non-working-days" element={<NonWorkingDays />} />
            
            {/* System Section */}
            <Route path="activity" element={<ActivityLog />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          {/* Fallback override */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}