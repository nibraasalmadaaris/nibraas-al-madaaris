// FIRST import on purpose: it wraps window.fetch (to wait for database saves before an update reload).
// The Supabase client keeps the fetch it sees when it is created, so this must be evaluated before
// ./App.jsx (ES modules run in import order). Do not move it below the App import.
import { registerServiceWorker } from "./registerServiceWorker";
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerServiceWorker();

