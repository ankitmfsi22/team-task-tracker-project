import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <StrictMode>
    <main className="p-6">
      <h1 className="text-xl font-semibold">Team Task Tracker</h1>
    </main>
  </StrictMode>,
);
