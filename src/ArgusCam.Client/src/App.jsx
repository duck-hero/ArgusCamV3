import React from 'react';
import { AuthProvider } from './features/auth/AuthContext.jsx';
import { AppRouter } from './routes/AppRoutes.jsx';
import { ToastProvider } from './components/Toast.jsx';
import './index.css';

// Main App component with authentication and routing
function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
