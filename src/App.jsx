import { Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import MobileContainer from './components/MobileContainer'
import ProtectedRoute from './components/ProtectedRoute'
import AuthExpiredListener from './components/AuthExpiredListener.jsx'
import LoadingSpinner from './components/ui/LoadingSpinner.jsx'
import lazyWithRetry from './utils/lazyWithRetry'
// Eager (sin lazy — se incluyen en el chunk principal):
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
// Lazy con reintento — tras un deploy (skipWaiting) los chunks viejos se purgan
// del precache; si el import() falla, lazyWithRetry recarga la pagina una vez:
const ConvocatoriaPage = lazyWithRetry(() => import('./pages/ConvocatoriaPage'))
const AttendancePage = lazyWithRetry(() => import('./pages/AttendancePage'))
const SavedPage = lazyWithRetry(() => import('./pages/SavedPage'))
const DashboardPage = lazyWithRetry(() => import('./pages/DashboardPage'))

/** Componente raiz — configura rutas, lazy loading y guardias de rol */
function App() {
  return (
    <BrowserRouter>
      <AuthExpiredListener />
      <MobileContainer>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/convocatorias" element={
              <ProtectedRoute allowedRole="teacher"><ConvocatoriaPage /></ProtectedRoute>
            } />
            <Route path="/attendance" element={
              <ProtectedRoute allowedRole="teacher"><AttendancePage /></ProtectedRoute>
            } />
            <Route path="/saved" element={
              <ProtectedRoute allowedRole="teacher"><SavedPage /></ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRole="ceo"><DashboardPage /></ProtectedRoute>
            } />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </MobileContainer>
    </BrowserRouter>
  )
}

export default App
