import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sparkles, ExternalLink, AlertCircle, Clock, Eye, MessageSquare, Edit3, ShieldAlert } from 'lucide-react';
import FlowchartEditor from '../components/FlowchartEditor';
import { Button } from '@/components/ui/button';
import { api } from '../utils/api';

const PublicView = () => {
  const { id: token } = useParams(); // 'id' param is now the share token
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null); // 'expired', 'revoked', 'invalid', 'not-found'
  const [process, setProcess] = useState(null);
  const [accessLevel, setAccessLevel] = useState('view');
  const [shareInfo, setShareInfo] = useState(null);

  useEffect(() => {
    loadSharedProcess();
  }, [token]);

  const loadSharedProcess = async () => {
    try {
      // Call the token-based view endpoint
      const response = await api.getSharedProcess(token);
      
      setProcess(response.process);
      setAccessLevel(response.accessLevel);
      setShareInfo(response.shareInfo);
      
    } catch (error) {
      console.error('Failed to load shared process:', error);
      
      // Parse error response
      const errorMessage = error.response?.data?.detail || 'Failed to load process';
      
      // Determine error type for better UX
      if (errorMessage.includes('expired')) {
        setErrorType('expired');
        setError('This share link has expired');
      } else if (errorMessage.includes('revoked')) {
        setErrorType('revoked');
        setError('This share link has been revoked by the owner');
      } else if (errorMessage.includes('not found') || errorMessage.includes('invalid')) {
        setErrorType('invalid');
        setError('Invalid or expired share link');
      } else if (errorMessage.includes('not published')) {
        setErrorType('unpublished');
        setError('This process is no longer published');
      } else if (error.response?.status === 404) {
        setErrorType('not-found');
        setError('Share link not found');
      } else if (error.response?.status === 403) {
        setErrorType('forbidden');
        setError('Access denied to this process');
      } else {
        setErrorType('unknown');
        setError('Unable to load the process');
      }
    } finally {
      setLoading(false);
    }
  };

  const getAccessLevelDisplay = () => {
    const icons = {
      view: <Eye className="w-4 h-4" />,
      comment: <MessageSquare className="w-4 h-4" />,
      edit: <Edit3 className="w-4 h-4" />
    };
    
    const labels = {
      view: 'View Only',
      comment: 'Can Comment',
      edit: 'Can Suggest Edits'
    };
    
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700">
        {icons[accessLevel]}
        {labels[accessLevel]} Access
      </span>
    );
  };

  const getErrorIcon = () => {
    switch (errorType) {
      case 'expired':
        return <Clock className="w-8 h-8 text-amber-600" />;
      case 'revoked':
        return <ShieldAlert className="w-8 h-8 text-red-600" />;
      case 'invalid':
      case 'not-found':
        return <AlertCircle className="w-8 h-8 text-slate-600" />;
      default:
        return <AlertCircle className="w-8 h-8 text-red-600" />;
    }
  };

  const getErrorColor = () => {
    switch (errorType) {
      case 'expired':
        return 'amber';
      case 'revoked':
        return 'red';
      case 'invalid':
      case 'not-found':
        return 'slate';
      default:
        return 'red';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading shared process...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const color = getErrorColor();
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className={`w-16 h-16 bg-${color}-100 rounded-full flex items-center justify-center mx-auto mb-4`}>
            {getErrorIcon()}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Unable to Access Process
          </h2>
          <p className="text-slate-600 mb-6">{error}</p>
          
          {errorType === 'expired' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-amber-800">
                <strong>Tip:</strong> Share links can have expiration dates. Contact the process owner to get a new link.
              </p>
            </div>
          )}
          
          {errorType === 'revoked' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-red-800">
                <strong>Note:</strong> The owner has revoked access to this process. Please contact them for more information.
              </p>
            </div>
          )}
          
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate('/')} variant="outline">
              Go to Home
            </Button>
            <Button 
              onClick={() => navigate('/signup')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
            >
              Create Your Own
            </Button>
          </div>
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
              📄 {process?.name || 'Untitled Process'}
            </p>
            <p className="text-xs text-blue-700">
              Shared by {shareInfo?.createdBy || 'Someone'} · 
              Published {process?.publishedAt ? new Date(process.publishedAt).toLocaleDateString() : 'recently'}
              {shareInfo?.expiresAt && (
                <> · Expires {new Date(shareInfo.expiresAt).toLocaleDateString()}</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {getAccessLevelDisplay()}
          </div>
        </div>
      </div>

      {/* Flowchart Viewer (Read-only with access level) */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <FlowchartEditor 
          theme="minimalist" 
          readOnly={true}
          accessLevel={accessLevel}
          processData={process}
        />
      </div>

      {/* Footer CTA */}
      <div className="bg-slate-100 border-t border-slate-200 py-12 px-6 mt-12">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-slate-900 mb-4">
            Create Your Own Interactive Flowcharts
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
