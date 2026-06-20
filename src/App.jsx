import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DriverDashboard from './components/DriverDashboard'

// ---- BANZA UTUMIZE (IMPORT) AMAPAJI YANJE AMASHYA ARI MURI PAGES FOLDER ----
import Motorcycles from './pages/Motorcycles'
import Drivers from './pages/Drivers'
import Assignments from './pages/Assignments'
import Collections from './pages/Collections'
import Debts from './pages/Debts'
import Expenses from './pages/Expenses'
import FleetSavingsGoals from './pages/FleetSavingsGoals'
import Inspections from './pages/Inspections'
import Documents from './pages/Documents'
import ActivityLog from './pages/ActivityLog'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Inzira z'ibanze */}
          <Route path="/login" element={<Login />} />
          
          {/* Paji y'Umutari - Yigenga */}
          <Route path="/driver" element={
            <ProtectedRoute>
              <DriverDashboard />
            </ProtectedRoute>
          } />

          {/* Admin Layout - Hano noneho twongereyeho routes zose z'imbere */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            {/* Dashboard niyo paji ya mbere (Index) */}
            <Route index element={<Dashboard />} />
            
            {/* Fleet Management */}
            <Route path="motorcycles" element={<Motorcycles />} />
            <Route path="drivers" element={<Drivers />} />
            <Route path="assignments" element={<Assignments />} />
            
            {/* Money & Finances */}
            <Route path="collections" element={<Collections />} />
            <Route path="debts" element={<Debts />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="fleet-savings" element={<FleetSavingsGoals />} />
            
            {/* Compliance */}
            <Route path="inspections" element={<Inspections />} />
            <Route path="documents" element={<Documents />} />
            
            {/* System logs */}
            <Route path="activity" element={<ActivityLog />} />
          </Route>
          
          {/* Redirect niba ari ubusa cyangwa bitazwi */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}