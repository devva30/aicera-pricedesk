import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Prevent number inputs from changing values on mouse wheel scroll
document.addEventListener('wheel', function (e) {
  if (document.activeElement && (document.activeElement as HTMLInputElement).type === 'number') {
    (document.activeElement as HTMLInputElement).blur()
  }
}, { passive: true })
