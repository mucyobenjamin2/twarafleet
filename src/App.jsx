import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Motorcycles from './pages/Motorcycles'
import Drivers from './pages/Drivers'
import Assignments from './pages/Assignments'
import Collections from './pages/Collections'
import Debts from './pages/Debts'
import Expenses from './pages/Expenses'
import NonWorkingDays from './pages/NonWorkingDays'
import SavingsGoals from './pages/SavingsGoals'
import FleetSavingsGoals from './pages/FleetSavingsGoals'
import Reminders from './pages/Reminders'
import Insurance from './pages/Insurance'
import Tax from './pages/Tax'
import Inspections from './pages/Inspections'
import Documents from './pages/Documents'
import Notifications from './pages/Notifications'
import ActivityLog from './pages/ActivityLog'
import Settings from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="motorcycles" element={<Motorcycles />} />
            <Route path="drivers" element={<Drivers />} />
            <Route path="assignments" element={<Assignments />} />
            <Route path="collections" element={<Collections />} />
            <Route path="debts" element={<Debts />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="non-working-days" element={<NonWorkingDays />} />
            <Route path="savings" element={<SavingsGoals />} />
            <Route path="fleet-savings" element={<FleetSavingsGoals />} />
            <Route path="reminders" element={<Reminders />} />
            <Route path="insurance" element={<Insurance />} />
            <Route path="tax" element={<Tax />} />
            <Route path="inspections" element={<Inspections />} />
            <Route path="documents" element={<Documents />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="activity" element={<ActivityLog />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
