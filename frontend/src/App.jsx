import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import BottomNav from './components/BottomNav.jsx';

import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Home from './pages/Home.jsx';
import StorySoFar from './pages/StorySoFar.jsx';
import Relatable from './pages/Relatable.jsx';
import Profile from './pages/Profile.jsx';
import Privacy from './pages/Privacy.jsx';
import Terms from './pages/Terms.jsx';

export default function App() {
  const { accessToken } = useAuth();
  const location = useLocation();
  const showNav = accessToken && !['/login', '/signup'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-paper">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/story"
          element={
            <ProtectedRoute>
              <StorySoFar />
            </ProtectedRoute>
          }
        />
        <Route
          path="/relatable"
          element={
            <ProtectedRoute>
              <Relatable />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
      </Routes>

      {showNav && <BottomNav />}
    </div>
  );
}
