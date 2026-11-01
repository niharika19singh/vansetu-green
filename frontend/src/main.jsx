import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ui/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary featureName="VanSetu Urban Climate Intelligence Platform">
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
