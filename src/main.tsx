import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { CharacterForge } from './pages/CharacterForge';
import { queryClient } from './lib/queryClient';
import './index.css';
import './components/chat/chat.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/forge" element={<CharacterForge />} />
          <Route path="/forge/:id" element={<CharacterForge />} />
          <Route path="/forge/:id/edit" element={<CharacterForge />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
