import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootEl = document.getElementById('root');

if (!rootEl) {
  throw new Error("Root element not found");
}

const root = ReactDOM.createRoot(rootEl);

// Render simple first to prove React is working
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);