import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { useThemeStore } from './stores/useStore.ts';

// Apply persisted theme on startup
const savedTheme = (JSON.parse(localStorage.getItem('theme-store') ?? '{}') as { state?: { theme?: string } })?.state?.theme ?? 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

// Suppress zustand rehydration before render
useThemeStore.getState();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
