import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Fix malformed double-path URLs that occur with HashRouter when pathname is non-root.
// e.g. /deals/deal-123#/deals/deal-456 should become /#/deals/deal-456
// e.g. /deals/deal-123 (no hash) should become /#/deals/deal-123
if (typeof window !== 'undefined' && window.location.pathname !== '/' && window.location.pathname.length > 1) {
  const hash = window.location.hash   // e.g. "#/deals/deal-456" or ""
  const path = window.location.pathname  // e.g. "/deals/deal-123"
  const search = window.location.search || ''
  if (hash && hash.startsWith('#/')) {
    // Has a valid hash route — keep the hash route, drop the stale pathname
    window.location.replace(`${window.location.origin}/${hash}${search}`)
  } else {
    // No hash — treat pathname as the route
    window.location.replace(`${window.location.origin}/#${path}${search}`)
  }
}

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
