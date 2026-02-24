import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import MobileContainer from './components/MobileContainer'
import LoginPage from './pages/LoginPage'
import AttendancePage from './pages/AttendancePage'
import SavedPage from './pages/SavedPage'
import DashboardPage from './pages/DashboardPage'

function App() {
  return (
    <BrowserRouter>
      <MobileContainer>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </MobileContainer>
    </BrowserRouter>
  )
}

export default App
