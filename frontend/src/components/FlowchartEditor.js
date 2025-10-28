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
    <div className="flex h-[calc(100vh-80px)]" data-testid="flowchart-editor">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between flex-shrink-0">
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

        {/* Canvas - scrollable */}
        <div className="flex-1 overflow-auto bg-slate-50" data-testid="flowchart-canvas">
          <div className="max-w-5xl mx-auto p-8">
            {/* Legend */}
            <div className="mb-8 bg-white rounded-2xl p-5 border border-slate-300/50 shadow-md flex flex-wrap gap-5 text-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm"></div>
                <span className="text-slate-700 font-medium">Trigger</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-lg bg-white border border-emerald-300/60 shadow-sm"></div>
                <span className="text-slate-700 font-medium">Active</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-lg bg-white border border-amber-300/60 shadow-sm"></div>
                <span className="text-slate-700 font-medium">Warning</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 shadow-sm"></div>
                <span className="text-slate-700 font-medium">Critical Gap</span>
              </div>
            </div>

            {/* Flowchart Nodes */}
            <div className="flex flex-col items-center space-y-0">
              {process.nodes?.map((node, idx) => (
                <div key={node.id} className="node-container w-full max-w-2xl">
                  <FlowNode
                    node={node}
                    onClick={() => setSelectedNode(node)}
                    isSelected={selectedNode?.id === node.id}
                  />
                  {idx < process.nodes.length - 1 && (
                    <div className="flex justify-center py-2 arrow-connector">
                      <svg width="24" height="28" viewBox="0 0 24 24" className="text-slate-300">
                        <polygon points="12,2 12,18 12,18" stroke="currentColor" strokeWidth="1.5" fill="none" />
                        <polygon points="12,22 7,15 17,15" fill="currentColor" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Summary Sections */}
            {(process.criticalGaps?.length > 0 || process.improvementOpportunities?.length > 0) && (
              <div className="mt-8 space-y-4">
                {/* Critical Gaps */}
                {process.criticalGaps?.length > 0 && (
                  <div className="bg-rose-50 border-2 border-rose-200 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-rose-900 mb-4">
                      Critical Gaps ({process.criticalGaps.length})
                    </h3>
                    <ul className="space-y-2">
                      {process.criticalGaps.map((gap, idx) => (
                        <li key={idx} className="text-sm text-rose-800">
                          <strong>Gap {idx + 1}:</strong> {gap}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Improvement Opportunities */}
                {process.improvementOpportunities?.length > 0 && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-blue-900 mb-4">
                      Improvement Opportunities
                    </h3>
                    <ul className="space-y-2">
                      {process.improvementOpportunities.map((opp, idx) => (
                        <li key={idx} className="text-sm text-blue-800">
                          • {opp.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Panel - Slides from Right */}
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
