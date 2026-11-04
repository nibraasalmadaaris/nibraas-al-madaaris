import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Must stay BEFORE App: it wraps window.fetch so the update bar can wait for database saves, and the
// Supabase client keeps the fetch function it sees when it is created.
import { registerServiceWorker } from "./registerServiceWorker";
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerServiceWorker();

