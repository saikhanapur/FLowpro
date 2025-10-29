import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import '@/App.css';
import Dashboard from './components/Dashboard';
import ProcessCreator from './components/ProcessCreator';
import FlowchartEditor from './components/FlowchartEditor';
import TemplateGallery from './components/TemplateGallery';
import Header from './components/Header';
import { Toaster } from '@/components/ui/sonner';
import { api } from './utils/api';

function App() {
  const [theme, setTheme] = useState('minimalist');
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      const data = await api.getWorkspaces();
      setWorkspaces(data);
      // Set default workspace as current
      const defaultWs = data.find(ws => ws.isDefault) || data[0];
      if (defaultWs) {
        setCurrentWorkspace(defaultWs);
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
  };

  return (
    <div className="App min-h-screen">
      <BrowserRouter>
        <Header theme={theme} onThemeChange={setTheme} />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create" element={<ProcessCreator />} />
          <Route path="/edit/:id" element={<FlowchartEditor theme={theme} />} />
          <Route path="/templates" element={<TemplateGallery />} />
        </Routes>
        <Toaster position="top-right" />
      </BrowserRouter>
    </div>
  );
}

export default App;
