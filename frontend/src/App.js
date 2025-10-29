import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import '@/App.css';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import PublicView from './pages/PublicView';
import Dashboard from './components/Dashboard';
import ProcessCreator from './components/ProcessCreator';
import FlowchartEditor from './components/FlowchartEditor';
import TemplateGallery from './components/TemplateGallery';
import Header from './components/Header';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import { api } from './utils/api';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Main App Content
const AppContent = () => {
  const [theme, setTheme] = useState('minimalist');
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadWorkspaces();
    }
  }, [isAuthenticated]);

  const loadWorkspaces = async () => {
    try {
      const data = await api.getWorkspaces();
      setWorkspaces(data);
      if (data.length > 0 && !currentWorkspace) {
        const defaultWorkspace = data.find(w => w.isDefault) || data[0];
        setCurrentWorkspace(defaultWorkspace);
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
  };

  return (
    <div className="App min-h-screen">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />
        } />
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
        } />
        <Route path="/signup" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Signup />
        } />
        
        {/* Public View for Published Processes */}
        <Route path="/view/:id" element={<PublicView />} />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Header 
              theme={theme} 
              onThemeChange={setTheme}
              currentWorkspace={currentWorkspace}
              workspaces={workspaces}
              onWorkspaceChange={setCurrentWorkspace}
              onWorkspacesUpdate={loadWorkspaces}
            />
            <Dashboard 
              currentWorkspace={currentWorkspace} 
              workspaces={workspaces}
              onWorkspacesUpdate={loadWorkspaces}
            />
          </ProtectedRoute>
        } />
        
        <Route path="/create" element={
          <ProtectedRoute>
            <Header 
              theme={theme} 
              onThemeChange={setTheme}
              currentWorkspace={currentWorkspace}
              workspaces={workspaces}
              onWorkspaceChange={setCurrentWorkspace}
              onWorkspacesUpdate={loadWorkspaces}
            />
            <ProcessCreator currentWorkspace={currentWorkspace} />
          </ProtectedRoute>
        } />
        
        <Route path="/edit/:id" element={
          <ProtectedRoute>
            <Header 
              theme={theme} 
              onThemeChange={setTheme}
              currentWorkspace={currentWorkspace}
              workspaces={workspaces}
              onWorkspaceChange={setCurrentWorkspace}
              onWorkspacesUpdate={loadWorkspaces}
            />
            <FlowchartEditor theme={theme} />
          </ProtectedRoute>
        } />
        
        <Route path="/templates" element={
          <ProtectedRoute>
            <Header 
              theme={theme} 
              onThemeChange={setTheme}
              currentWorkspace={currentWorkspace}
              workspaces={workspaces}
              onWorkspaceChange={setCurrentWorkspace}
              onWorkspacesUpdate={loadWorkspaces}
            />
            <TemplateGallery />
          </ProtectedRoute>
        } />
      </Routes>
      <Toaster position="top-right" />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
