import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import MobileContainer from './components/MobileContainer'
import LoginPage from './pages/LoginPage'
import AttendancePage from './pages/AttendancePage'
import SavedPage from './pages/SavedPage'

function App() {
  return (
    <BrowserRouter>
      <MobileContainer>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/saved" element={<SavedPage />} />
        </Routes>
      </MobileContainer>
    </BrowserRouter>
  )
}

export default App
