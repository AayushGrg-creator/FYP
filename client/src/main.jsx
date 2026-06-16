/* ──────────────────────────────────────────────────────────────────────────── */
/* main.jsx - Entry Point for Task Tide                                         */
/* ──────────────────────────────────────────────────────────────────────────── */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

/* 1. Import Design Tokens & Global Styles First */
import './styles/variables.css';
import './styles/index.css';
import './styles/components.css';

/* 2. Mount Application to the DOM */
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);