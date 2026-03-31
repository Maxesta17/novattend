import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import MobileContainer from './components/MobileContainer'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingSpinner from './components/ui/LoadingSpinner.jsx'
// Eager (sin lazy — se incluyen en el chunk principal):
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
// Lazy — se cargan bajo demanda al navegar a cada ruta:
const ConvocatoriaPage = lazy(() => import('./pages/ConvocatoriaPage'))
const AttendancePage = lazy(() => import('./pages/AttendancePage'))
const SavedPage = lazy(() => import('./pages/SavedPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))

function App() {
  return (
    <BrowserRouter>
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
