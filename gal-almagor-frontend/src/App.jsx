import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LanguageProvider } from './contexts/LanguageContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Insights from './pages/Insights'
import Agents from './pages/Agents'

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/agents" element={<Agents />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  )
}

export default App