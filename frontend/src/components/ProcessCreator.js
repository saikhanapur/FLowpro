import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Upload, MessageSquare, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import VoiceRecorder from './VoiceRecorder';
import DocumentUploader from './DocumentUploader';
import ChatInterface from './ChatInterface';
import MultiProcessReview from './MultiProcessReview';
import { api } from '@/utils/api';
import { toast } from 'sonner';

const ProcessCreator = () => {
  const navigate = useNavigate();
  const [method, setMethod] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);

  const handleInputComplete = async (input, inputType) => {
    setProcessing(true);
    
    // Show toast with progress indicator
    const loadingToast = toast.loading('AI is analyzing your input... This may take 1-2 minutes for large documents.');
    
    try {
      const data = await api.parseProcess(input, inputType);
      toast.dismiss(loadingToast);
      setExtractedData(data);
      
      // Check if multiple processes were detected
      if (data.multipleProcesses && data.processCount >= 2) {
        toast.success(`Found ${data.processCount} distinct processes in your document!`, {
          duration: 5000
        });
      } else {
        toast.success('Process captured successfully!');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(error.response?.data?.detail || 'Failed to process input. Please try again or use a shorter document.');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerate = async () => {
    try {
      const process = {
        id: `process-${Date.now()}`,
        name: extractedData.processName,
        description: extractedData.description || '',
        nodes: extractedData.nodes.map((node, idx) => ({
          ...node,
          position: { x: 100, y: 100 + (idx * 150) }
        })),
        actors: extractedData.actors || [],
        criticalGaps: extractedData.criticalGaps || [],
        improvementOpportunities: extractedData.improvementOpportunities || [],
        status: 'draft',
        theme: 'minimalist',
        healthScore: 85,
        views: 0,
        version: 1
      };

      const created = await api.createProcess(process);
      toast.success('Process created!');
      navigate(`/edit/${created.id}`);
    } catch (error) {
      toast.error('Failed to create process');
      console.error(error);
    }
  };

  if (processing) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center max-w-lg px-6">
          <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
          
          <h2 className="text-3xl font-bold text-slate-800 mb-3">
            Analyzing Your Process...
          </h2>
          
          <p className="text-lg text-slate-600 mb-8">
            AI is extracting steps, actors, and dependencies
          </p>
          
          <div className="bg-blue-50 rounded-xl p-6 text-center border border-blue-100">
            <p className="text-base font-semibold text-blue-900 mb-3">
              This may take 1-2 minutes for large documents
            </p>
            <p className="text-sm text-blue-700 leading-relaxed">
              Claude AI is carefully analyzing your process to identify gaps, dependencies, and improvement opportunities.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (extractedData) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12" data-testid="extraction-summary">
        <Card className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                Process Captured Successfully!
              </h2>
              <p className="text-slate-600">
                Review what we found and generate your flowchart
              </p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {extractedData.nodes?.length || 0}
              </div>
              <div className="text-sm text-blue-800">Process Steps</div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-emerald-600 mb-1">
                {extractedData.actors?.length || 0}
              </div>
              <div className="text-sm text-emerald-800">People/Systems</div>
            </div>
            <div className="bg-rose-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-rose-600 mb-1">
                {extractedData.criticalGaps?.length || 0}
              </div>
              <div className="text-sm text-rose-800">Critical Gaps</div>
            </div>
          </div>

          {/* Process Name */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Process Name
            </label>
            <input
              type="text"
              value={extractedData.processName}
              onChange={(e) => setExtractedData({...extractedData, processName: e.target.value})}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
              data-testid="process-name-input"
            />
          </div>

          {/* Responsible Parties */}
          {extractedData.actors?.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Responsible Parties
              </label>
              <div className="flex flex-wrap gap-2">
                {extractedData.actors.map((actor, i) => (
                  <Badge key={i} variant="secondary">{actor}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Steps Preview */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Process Steps ({extractedData.nodes?.length || 0})
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {extractedData.nodes?.map((node, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-800">{node.title}</div>
                    <div className="text-sm text-slate-600">{node.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Critical Gaps */}
          {extractedData.criticalGaps?.length > 0 && (
            <div className="mb-8">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Critical Gaps Identified
              </label>
              <div className="space-y-2">
                {extractedData.criticalGaps.map((gap, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-rose-800">{gap}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              onClick={handleGenerate}
              className="flex-1 gradient-blue text-white"
              data-testid="generate-flowchart-btn"
            >
              Generate Flowchart →
            </Button>
            <Button
              onClick={() => setExtractedData(null)}
              variant="outline"
            >
              Start Over
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!method) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12" data-testid="method-selection">
        <Button
          onClick={() => navigate('/')}
          variant="ghost"
          className="mb-6"
          data-testid="back-to-dashboard"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold heading-font mb-6 leading-tight">
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Create Your Process Flowchart
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
            Choose how you'd like to document your process
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Voice Option */}
          <Card
            className="p-8 border-2 border-slate-200 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 cursor-pointer group relative overflow-hidden"
            onClick={() => setMethod('voice')}
            data-testid="method-voice"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                <Mic className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3 text-center group-hover:text-blue-600 transition-colors">
                Voice Recording
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed text-center mb-6">
                Simply explain your process out loud. Our AI will transcribe and structure it automatically.
              </p>
              <div className="text-center">
                <span className="inline-flex items-center gap-2 text-blue-600 font-semibold group-hover:gap-3 transition-all">
                  ~2-3 minutes
                  <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </div>
            </div>
          </Card>

          {/* Document Option */}
          <Card
            className="p-8 border-2 border-slate-200 hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-300 cursor-pointer group relative overflow-hidden"
            onClick={() => setMethod('document')}
            data-testid="method-document"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                <Upload className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3 text-center group-hover:text-emerald-600 transition-colors">
                Upload Document
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed text-center mb-6">
                Have existing documentation? Upload PDFs, Word docs, or even emails and we'll extract the process.
              </p>
              <div className="text-center">
                <span className="inline-flex items-center gap-2 text-emerald-600 font-semibold group-hover:gap-3 transition-all">
                  ~1 minute
                  <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </div>
            </div>
          </Card>

          {/* Chat Option */}
          <Card
            className="p-8 border-2 border-slate-200 hover:border-amber-500 hover:shadow-2xl hover:shadow-amber-500/20 transition-all duration-300 cursor-pointer group relative overflow-hidden"
            onClick={() => setMethod('chat')}
            data-testid="method-chat"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                <MessageSquare className="w-10 h-10 text-amber-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3 text-center group-hover:text-amber-600 transition-colors">
                Chat with AI
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed text-center mb-6">
                Answer questions interactively. Our AI will guide you through documenting your process step-by-step.
              </p>
              <div className="text-center">
                <span className="inline-flex items-center gap-2 text-amber-600 font-semibold group-hover:gap-3 transition-all">
                  ~5 minutes
                  <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <Button
        onClick={() => setMethod(null)}
        variant="ghost"
        className="mb-6"
        data-testid="change-method-btn"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Change Input Method
      </Button>

      {method === 'voice' && (
        <VoiceRecorder
          onComplete={(transcript) => handleInputComplete(transcript, 'voice_transcript')}
          onCancel={() => setMethod(null)}
        />
      )}

      {method === 'document' && (
        <DocumentUploader
          onComplete={(text) => handleInputComplete(text, 'document')}
          onCancel={() => setMethod(null)}
        />
      )}

      {method === 'chat' && (
        <ChatInterface
          onComplete={(conversation) => handleInputComplete(conversation, 'chat')}
          onCancel={() => setMethod(null)}
        />
      )}
    </div>
  );
};

export default ProcessCreator;
