import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WorkoutProvider } from './contexts/WorkoutContext';

// Components
import LoginPage from './pages/LoginPage';
import ProfileSetup from './pages/ProfileSetup';
import Dashboard from './pages/Dashboard';
import WorkoutPage from './pages/WorkoutPage';
import PlanCreation from './pages/PlanCreation';
import CalendarPage from './pages/CalendarPage';
import FloatingChatbot from './components/FloatingChatbot';
import LoadingSpinner from './components/LoadingSpinner';

// Styles
import './App.css';

function AppContent() {
  const { user, loading, isAuthenticated } = useAuth();
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  useEffect(() => {
    if (user) {
      // Check if user profile is complete
      const requiredFields = ['name', 'age', 'weight', 'height', 'fitness_goal'];
      const isComplete = requiredFields.every(field => user[field]);
      setIsProfileComplete(isComplete);
    }
  }, [user]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />} 
        />
        
        {/* Protected Routes */}
        <Route 
          path="/profile-setup" 
          element={
            isAuthenticated ? (
              !isProfileComplete ? <ProfileSetup /> : <Navigate to="/dashboard" />
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        
        <Route 
          path="/dashboard" 
          element={
            isAuthenticated ? (
              isProfileComplete ? <Dashboard /> : <Navigate to="/profile-setup" />
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        
        <Route 
          path="/workout" 
          element={
            isAuthenticated ? (
              isProfileComplete ? <WorkoutPage /> : <Navigate to="/profile-setup" />
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        
        <Route 
          path="/plan-creation" 
          element={
            isAuthenticated ? (
              isProfileComplete ? <PlanCreation /> : <Navigate to="/profile-setup" />
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        
        <Route 
          path="/calendar" 
          element={
            isAuthenticated ? (
              isProfileComplete ? <CalendarPage /> : <Navigate to="/profile-setup" />
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        
        {/* Default Route */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              isProfileComplete ? <Navigate to="/dashboard" /> : <Navigate to="/profile-setup" />
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
      </Routes>
      
      {/* Floating Chatbot - Available on all authenticated pages */}
      {isAuthenticated && isProfileComplete && <FloatingChatbot />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <WorkoutProvider>
          <AppContent />
        </WorkoutProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
