import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import AppPage from './pages/AppPage'
import ComparePage from './pages/ComparePage'
import GraphPage from './pages/GraphPage'
import OraclePage from './pages/OraclePage'
import LexMindPage from './pages/LexMindPage'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<AppPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/oracle" element={<OraclePage />} />
        <Route path="/lexmind" element={<LexMindPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)

