import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Share2, Save, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FlowNode from './FlowNode';
import DetailPanel from './DetailPanel';
import IdealStateModal from './IdealStateModal';
import ExportModal from './ExportModal';
import { api } from '@/utils/api';
import { toast } from 'sonner';

const FlowchartEditor = ({ theme }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [process, setProcess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showIdealState, setShowIdealState] = useState(false);
  const [idealStateData, setIdealStateData] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProcess();
  }, [id]);

  const loadProcess = async () => {
    try {
      const data = await api.getProcess(id);
      setProcess(data);
    } catch (error) {
      toast.error('Failed to load process');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateProcess(id, process);
      toast.success('Process saved successfully');
    } catch (error) {
      toast.error('Failed to save process');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateIdealState = async () => {
    try {
      const data = await api.generateIdealState(id);
      setIdealStateData(data);
      setShowIdealState(true);
    } catch (error) {
      toast.error('Failed to generate ideal state');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading process...</p>
        </div>
      </div>
    );
  }

  if (!process) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]" data-testid="flowchart-editor">
      {/* Toolbar */}
      <div className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate('/')} variant="ghost" size="sm" data-testid="back-btn">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-lg font-bold text-slate-800">{process.name}</h2>
            <p className="text-sm text-slate-600">v{process.version} • {process.nodes?.length || 0} steps</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleGenerateIdealState} variant="outline" size="sm" data-testid="ideal-state-btn">
            <Sparkles className="w-4 h-4 mr-2" />
            Ideal State
          </Button>
          <Button onClick={() => setShowExportModal(true)} variant="outline" size="sm" data-testid="export-btn">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm" data-testid="save-btn">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-slate-50 p-8" data-testid="flowchart-canvas">
          <div className="max-w-4xl mx-auto space-y-6">
            {process.nodes?.map((node, idx) => (
              <div key={node.id}>
                <FlowNode
                  node={node}
                  onClick={() => setSelectedNode(node)}
                  isSelected={selectedNode?.id === node.id}
                />
                {idx < process.nodes.length - 1 && (
                  <div className="flex justify-center my-2">
                    <div className="w-0.5 h-12 bg-slate-300"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedNode && (
          <DetailPanel
            node={selectedNode}
            processId={process.id}
            onClose={() => setSelectedNode(null)}
            onUpdate={(updatedNode) => {
              setProcess({
                ...process,
                nodes: process.nodes.map(n => n.id === updatedNode.id ? updatedNode : n)
              });
            }}
          />
        )}
      </div>

      {/* Modals */}
      {showIdealState && idealStateData && (
        <IdealStateModal
          data={idealStateData}
          onClose={() => setShowIdealState(false)}
        />
      )}

      {showExportModal && (
        <ExportModal
          process={process}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
};

export default FlowchartEditor;
