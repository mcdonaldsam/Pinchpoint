import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import SchedulePreview from './pages/SchedulePreview'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SchedulePreview />
  </StrictMode>,
)
