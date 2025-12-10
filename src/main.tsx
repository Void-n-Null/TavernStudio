import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { scan } from 'react-scan';
import './index.css';
import './components/chat/chat.css';
import { App } from './App';

// Enable react-scan in development
if (import.meta.env.DEV) {
  scan({
    enabled: true,
    log: true, // Log renders to console
  });
}

/**
 * Application entry point.
 * 
 * Single responsibility: Mount React app to DOM.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
