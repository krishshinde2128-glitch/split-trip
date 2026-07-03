import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CreateTrip from './pages/CreateTrip';
import TripLobby from './pages/TripLobby';
import AuthPage from './pages/AuthPage';
import useAuthStore from './store/useAuthStore';

function App() {
  const { user, loading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
        <AuthPage />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
        <Routes>
          <Route path="/" element={<CreateTrip />} />
          <Route path="/trip/:id" element={<TripLobby />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
