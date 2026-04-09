import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';

// Ensure root element exists and is properly typed
const rootElement = document.getElementById('root') as HTMLElement;

if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// ⚠️ StrictMode removed temporarily to prevent double-render issues during development
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
