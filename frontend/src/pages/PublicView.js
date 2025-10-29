import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sparkles, ExternalLink, AlertCircle } from 'lucide-react';
import FlowchartEditor from '../components/FlowchartEditor';
import { Button } from '@/components/ui/button';
import { api } from '../utils/api';

const PublicView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [process, setProcess] = useState(null);

  useEffect(() => {
    loadProcess();
  }, [id]);

  const loadProcess = async () => {
    try {
      const data = await api.getProcess(id);
      
      // Check if process is published
      if (data.status !== 'published') {
        setError('This process is not publicly available.');
        return;
      }
      
      setProcess(data);
    } catch (error) {
      console.error('Failed to load process:', error);
      if (error.response?.status === 403) {
        setError('This process is private.');
      } else if (error.response?.status === 404) {
        setError('Process not found.');
      } else {
        setError('Failed to load process.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading process...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Unable to View Process
          </h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <Button onClick={() => navigate('/')}>
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Public Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">SuperHumanly</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(window.location.href, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>
            <Button
              onClick={() => navigate('/signup')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
            >
              Create Your Own
            </Button>
          </div>
        </div>
      </header>

      {/* Process Info Banner */}
      <div className="bg-blue-50 border-b border-blue-200 py-3 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-900 font-medium">
              📄 {process?.processName || 'Untitled Process'}
            </p>
            <p className="text-xs text-blue-700">
              Published {process?.publishedAt ? new Date(process.publishedAt).toLocaleDateString() : 'recently'}
            </p>
          </div>
          <div className="text-xs text-blue-700">
            ✓ Public View
          </div>
        </div>
      </div>

      {/* Flowchart Viewer (Read-only) */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <FlowchartEditor 
          theme="minimalist" 
          readOnly={true}
          processData={process}
        />
      </div>

      {/* Footer CTA */}
      <div className="bg-slate-100 border-t border-slate-200 py-12 px-6 mt-12">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-slate-900 mb-4">
            Create Your Own Process Flowcharts
          </h3>
          <p className="text-lg text-slate-600 mb-6">
            Turn your process documents into interactive flowcharts in 2 minutes with AI
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/signup')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-6 text-lg"
          >
            Get Started Free
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PublicView;
