import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/manrope';
import './index.css';
import App from './App';

declare global {
  interface Window {
    __spendwiseBooted?: boolean;
  }
}

// Tell the production boot guard the app started, and remove its message if a slow load triggered it.
window.__spendwiseBooted = true;
document.getElementById('boot-error')?.remove();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
