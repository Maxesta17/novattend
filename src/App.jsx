import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import MobileContainer from './components/MobileContainer'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import ConvocatoriaPage from './pages/ConvocatoriaPage'
import AttendancePage from './pages/AttendancePage'
import SavedPage from './pages/SavedPage'
import DashboardPage from './pages/DashboardPage'

function App() {
  return (
    <BrowserRouter>
      <MobileContainer>
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
        </Routes>
      </MobileContainer>
    </BrowserRouter>
  )
}

export default App
