import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DriverDashboard from './components/DriverDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Inzira z'ibanze */}
          <Route path="/login" element={<Login />} />
          
          {/* Paji y'Umutari - Yigenga (nayo ibanza kureba niba uwinjiye yemerewe) */}
          <Route path="/driver" element={
            <ProtectedRoute>
              <DriverDashboard />
            </ProtectedRoute>
          } />

          {/* Admin Layout - Iyi ifite Routes zayo zose z'imbere */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
          </Route>
          
          {/* Redirect niba ari ubusa cyangwa bitazwi */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}