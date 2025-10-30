import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Share2, Save, Sparkles, CheckCircle, Edit3, Copy, Check, ArrowUp, ArrowDown, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import FlowNode from './FlowNode';
import DetailPanel from './DetailPanel';
import IdealStateModal from './IdealStateModal';
import ExportModal from './ExportModal';
import ShareModal from './ShareModal';
import { api } from '@/utils/api';
import { toast } from 'sonner';

const FlowchartEditor = ({ theme, readOnly = false, accessLevel = 'owner', processData }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [process, setProcess] = useState(processData || null);
  const [loading, setLoading] = useState(!processData);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showIdealState, setShowIdealState] = useState(false);
  const [idealStateData, setIdealStateData] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showRepublishPrompt, setShowRepublishPrompt] = useState(false);

  useEffect(() => {
    if (!processData) {
      loadProcess();
    }
  }, [id, processData]);

  const loadProcess = async () => {
    if (processData) return; // Skip if already provided
    
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

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const updated = await api.publishProcess(id);
      setProcess(updated);
      setShowPublishDialog(false);
      toast.success('🎉 Process published! Now shareable with your team.');
    } catch (error) {
      toast.error('Failed to publish process');
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    try {
      const updated = await api.unpublishProcess(id);
      setProcess(updated);
      toast.success('Process returned to draft mode');
    } catch (error) {
      toast.error('Failed to unpublish process');
    }
  };

  const handleShare = async () => {
    // Open share modal with access controls
    setShowShareModal(true);
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

  const handleMoveNode = async (nodeIndex, direction) => {
    if (reordering) return; // Prevent concurrent reorders
    
    const newIndex = direction === 'up' ? nodeIndex - 1 : nodeIndex + 1;
    
    // Check bounds
    if (newIndex < 0 || newIndex >= process.nodes.length) return;
    
    setReordering(true);
    setHasUnsavedChanges(true); // Mark as having changes
    try {
      // Swap nodes in array
      const newNodes = [...process.nodes];
      [newNodes[nodeIndex], newNodes[newIndex]] = [newNodes[newIndex], newNodes[nodeIndex]];
      
      // Extract node IDs in new order
      const nodeIds = newNodes.map(n => n.id);
      
      // Save to backend immediately (for reordering we save right away)
      const response = await api.reorderNodes(process.id, nodeIds);
      
      // Update local state with backend response
      setProcess({
        ...process,
        nodes: response.nodes
      });
      
      toast.success(`Step ${direction === 'up' ? 'moved up' : 'moved down'}`);
    } catch (error) {
      console.error('Failed to reorder:', error);
      toast.error('Failed to reorder step');
    } finally {
      setReordering(false);
    }
  };

  const handleEnterEditMode = () => {
    setIsEditMode(true);
    setHasUnsavedChanges(false);
  };

  const handleExitEditMode = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to discard them?')) {
        setIsEditMode(false);
        setHasUnsavedChanges(false);
        loadProcess(); // Reload to discard changes
      }
    } else {
      setIsEditMode(false);
    }
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      // Already saved individual changes (nodes, reordering)
      // This is just to finalize and check if republish needed
      const wasPublished = process.status === 'published';
      
      setHasUnsavedChanges(false);
      setIsEditMode(false);
      
      if (wasPublished) {
        setShowRepublishPrompt(true);
      } else {
        toast.success('Changes saved successfully!');
      }
      
      // Reload to ensure sync
      await loadProcess();
    } catch (error) {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleRepublish = async () => {
    try {
      await api.publishProcess(process.id);
      setShowRepublishPrompt(false);
      toast.success('Process republished!');
      await loadProcess();
    } catch (error) {
      toast.error('Failed to republish process');
    }
  };

  const handleAddNode = async () => {
    try {
      const response = await api.addNode(process.id, {
        title: "New Step",
        description: "Click to add details",
        status: "current",
        actors: [],
        subSteps: []
      });
      
      setProcess({
        ...process,
        nodes: response.nodes
      });
      setHasUnsavedChanges(true);
      toast.success('Step added!');
    } catch (error) {
      console.error('Failed to add node:', error);
      toast.error('Failed to add step');
    }
  };

  const handleDeleteNode = async (nodeId) => {
    if (!window.confirm('Are you sure you want to delete this step? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await api.deleteNode(process.id, nodeId);
      
      setProcess({
        ...process,
        nodes: response.nodes
      });
      setHasUnsavedChanges(true);
      setSelectedNode(null); // Close detail panel if deleting selected node
      toast.success('Step deleted');
    } catch (error) {
      console.error('Failed to delete node:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete step');
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
            {/* Published Badge */}
            {process?.status === 'published' && !isEditMode && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">Published</span>
              </div>
            )}
            
            {/* Export Button - Always Available */}
            <Button onClick={() => setShowExportModal(true)} variant="outline" size="sm" data-testid="export-btn">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            
            {/* Action Buttons (Hidden in readOnly mode) */}
            {!readOnly && (
              <>
                {isEditMode ? (
                  /* Edit Mode Buttons */
                  <>
                    <Button 
                      onClick={handleSaveChanges} 
                      disabled={saving}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button onClick={handleExitEditMode} variant="outline" size="sm">
                      Cancel
                    </Button>
                  </>
                ) : (
                  /* View Mode Buttons */
                  <>
                    {process?.status === 'published' && (
                      <Button 
                        onClick={handleShare} 
                        variant="default" 
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Share2 className="w-4 h-4 mr-2" />
                            Share
                          </>
                        )}
                      </Button>
                    )}
                    
                    <Button onClick={handleEnterEditMode} variant="outline" size="sm">
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit Process
                    </Button>
                    
                    {process?.status !== 'published' && (
                      <Button 
                        onClick={() => setShowPublishDialog(true)} 
                        variant="default" 
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Publish Process
                      </Button>
                    )}
                    
                    <Button onClick={handleGenerateIdealState} variant="outline" size="sm" data-testid="ideal-state-btn">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Ideal State
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Edit Mode Banner - Compact & Elegant */}
        {isEditMode && !readOnly && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-6 py-2.5">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-sm font-medium text-slate-700">
                  Editing Mode
                </span>
              </div>
              <span className="text-xs text-slate-500">
                Hover over nodes to reorder • Click to edit details
              </span>
            </div>
          </div>
        )}

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
                <span className="text-slate-700 font-medium">Active/Current</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-lg bg-white border border-amber-300/60 shadow-sm"></div>
                <span className="text-slate-700 font-medium">Warning/Issue</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-lg bg-white border border-slate-300/50 shadow-sm"></div>
                <span className="text-slate-700 font-medium">Completed</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 shadow-sm"></div>
                <span className="text-slate-700 font-medium">Critical Gap</span>
              </div>
            </div>

            {/* Flowchart Nodes */}
            <div className="flex flex-col items-center space-y-8">
              {process.nodes?.map((node, idx) => (
                <div key={node.id} className="w-full max-w-4xl">
                  <div 
                    className="node-container relative flex items-center gap-4"
                    style={{ transition: 'all 300ms ease-out' }}
                  >
                    {/* Left-Side Control Strip (Always Visible in Edit Mode, Hidden in Print) */}
                    {!readOnly && isEditMode && (
                      <div className="flex-shrink-0 w-12 bg-slate-100 rounded-xl border border-slate-200 p-2 shadow-sm print:hidden">
                        <div className="flex flex-col items-center gap-2">
                          <button
                            onClick={() => handleMoveNode(idx, 'up')}
                            disabled={idx === 0 || reordering}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-blue-50 shadow-sm hover:shadow-md disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 border border-slate-200"
                            title="Move Up"
                          >
                            <ArrowUp className="w-4 h-4 text-slate-600" />
                          </button>
                          
                          <button
                            onClick={() => handleMoveNode(idx, 'down')}
                            disabled={idx === process.nodes.length - 1 || reordering}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-blue-50 shadow-sm hover:shadow-md disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 border border-slate-200"
                            title="Move Down"
                          >
                            <ArrowDown className="w-4 h-4 text-slate-600" />
                          </button>
                          
                          <div className="w-6 h-px bg-slate-300 my-1"></div>
                          
                          <button
                            onClick={() => handleDeleteNode(node.id)}
                            disabled={process.nodes.length === 1}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-red-50 shadow-sm hover:shadow-md disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 border border-slate-200"
                            title="Delete Step"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <FlowNode
                        node={node}
                        onClick={() => setSelectedNode(node)}
                        isSelected={selectedNode?.id === node.id}
                      />
                    </div>
                  </div>
                  
                  {/* Arrow Connector - Bigger and More Connected */}
                  {idx < process.nodes.length - 1 && (
                    <div className="flex justify-center py-4 w-full">
                      <svg width="32" height="40" viewBox="0 0 32 40" className="text-slate-400">
                        <line x1="16" y1="0" x2="16" y2="28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                        <polygon points="16,40 6,26 26,26" fill="currentColor" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Add Step Button (Only in Edit Mode, Hidden in Print) */}
              {!readOnly && isEditMode && (
                <div className="w-full max-w-4xl print:hidden">
                  <div className="flex items-center gap-4">
                    <div className="w-12"></div> {/* Spacer for alignment with control strip */}
                    <button
                      onClick={handleAddNode}
                      className="flex-1 py-4 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 group"
                    >
                      <div className="flex items-center justify-center gap-2 text-slate-600 group-hover:text-blue-600">
                        <Plus className="w-5 h-5" />
                        <span className="font-medium">Add Step</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
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
            setHasUnsavedChanges(true);
          }}
          readOnly={readOnly || !isEditMode}
          accessLevel={accessLevel}
        />
      )}

      {/* Modals */}
      {showPublishDialog && (
        <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
                Publish Process
              </DialogTitle>
              <DialogDescription className="text-base pt-2">
                Publishing makes this process official and ready to share.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">What happens when you publish:</h4>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Version Control:</strong> Creates version {process.version + 1} for audit trail</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Team Visibility:</strong> Marks as official for stakeholders</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Professional Status:</strong> Shows completed work vs draft</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Shareable:</strong> Ready to export and share with clients</span>
                  </li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> You can return to draft mode anytime to make edits.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handlePublish} 
                disabled={publishing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {publishing ? 'Publishing...' : '✓ Publish Process'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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

      {showShareModal && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          processId={process?.id}
          processName={process?.name}
          isPublished={process?.status === 'published'}
        />
      )}

      {/* Republish Prompt Dialog */}
      <Dialog open={showRepublishPrompt} onOpenChange={setShowRepublishPrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Republish Process?</DialogTitle>
            <DialogDescription>
              You've made changes to a published process. Would you like to republish it so the changes are visible to people you've shared it with?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRepublishPrompt(false)}>
              Not Now
            </Button>
            <Button onClick={handleRepublish} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <CheckCircle className="w-4 h-4 mr-2" />
              Republish Process
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FlowchartEditor;
