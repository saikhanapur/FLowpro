import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Share2, Save, Sparkles, CheckCircle, Edit3, Copy, Check, ArrowUp, ArrowDown, Plus, Trash2, MessageSquare, X, FolderInput, FolderOpen, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// NEW: Simple scrollable flowchart (no React Flow)
import SimpleFlowchart from './SimpleFlowchart';
import IntegratedSidebar from './IntegratedSidebar';

// Legacy components
import FlowNode from './FlowNode';
import DetailPanel from './DetailPanel';
import IdealStateModal from './IdealStateModal';
import ExportModal from './ExportModal';
import ShareModal from './ShareModal';
import AIRefineChat from './AIRefineChat';
import ProcessIntelligencePanel from './ProcessIntelligencePanel';

import { api } from '@/utils/api';
import { toast } from 'sonner';

// React Flow components removed - using SimpleFlowchart instead

const FlowchartEditor = ({ theme, readOnly = false, accessLevel = 'owner', processData, isGuestMode = false }) => {
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
  const [showAIChat, setShowAIChat] = useState(false);
  const [showRefineWarning, setShowRefineWarning] = useState(false);
  const [wasAutoUnpublished, setWasAutoUnpublished] = useState(false);
  
  // Guest mode state
  const [showGuestSignupPrompt, setShowGuestSignupPrompt] = useState(false);
  
  // Simple node click handler
  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
  }, []);
  
  // Move to project state
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [movingProcess, setMovingProcess] = useState(false);

  // Process Intelligence state
  const [intelligence, setIntelligence] = useState(null);
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);
  const [showIntelligence, setShowIntelligence] = useState(false); // Hidden by default
  const [intelligenceBadgeVisible, setIntelligenceBadgeVisible] = useState(false);
  
  // State cleaned up - panels now integrated

  useEffect(() => {
    if (!processData) {
      loadProcess();
    }
    if (!isGuestMode) {
      loadWorkspaces();
    }
    loadIntelligence();
  }, [id, processData, isGuestMode]);

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

  const loadWorkspaces = async () => {
    try {
      const data = await api.getWorkspaces();
      setWorkspaces(data);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
  };

  const loadIntelligence = async () => {
    if (!id || readOnly) return; // Skip for read-only views
    
    setIntelligenceLoading(true);
    try {
      const data = await api.getProcessIntelligence(id);
      setIntelligence(data);
      
      // Show badge if issues found
      if (data?.issues && data.issues.length > 0) {
        setIntelligenceBadgeVisible(true);
      }
    } catch (error) {
      console.error('Failed to load intelligence:', error);
      // Don't show error toast - intelligence is optional
    } finally {
      setIntelligenceLoading(false);
    }
  };

  const regenerateIntelligence = async () => {
    if (!id || readOnly) return;
    
    setIntelligenceLoading(true);
    try {
      const data = await api.regenerateIntelligence(id);
      setIntelligence(data);
      toast.success('Intelligence regenerated with fresh analysis!');
    } catch (error) {
      console.error('Failed to regenerate intelligence:', error);
      toast.error('Failed to regenerate intelligence');
    } finally {
      setIntelligenceLoading(false);
    }
  };

  const handleMoveToWorkspace = async (targetWorkspace) => {
    setMovingProcess(true);
    try {
      await api.moveProcessToWorkspace(id, targetWorkspace.id);
      toast.success(`Moved to ${targetWorkspace.name}`);
      setShowMoveModal(false);
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to move process');
    } finally {
      setMovingProcess(false);
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
    // Check if guest user trying to publish
    if (isGuestMode) {
      setShowGuestSignupPrompt(true);
      return;
    }
    
    setPublishing(true);
    try {
      const updated = await api.publishProcess(id);
      setProcess(updated);
      setShowPublishDialog(false);
      toast.success('🎉 Process published! Now shareable with your team.');
    } catch (error) {
      // Check if backend rejected guest publish
      if (error.response?.status === 403) {
        setShowGuestSignupPrompt(true);
      } else {
        toast.error('Failed to publish process');
      }
    } finally {
      setPublishing(false);
    }
  };


  const handleRefineComplete = (refinedProcess) => {
    // Update process with refined data
    setProcess(prev => ({
      ...prev,
      ...refinedProcess
    }));
    
    // If process was published, show unpublish banner
    if (process?.status === 'published' && refinedProcess.status === 'draft') {
      setWasAutoUnpublished(true);
      toast.warning('Flowchart unpublished for review. Republish when ready.');
    }
  };

  const handleOpenAIChat = () => {
    // Check if flowchart is published
    if (process?.status === 'published') {
      setShowRefineWarning(true);
    } else {
      setShowAIChat(true);
    }
  };

  const handleConfirmRefine = () => {
    setShowRefineWarning(false);
    setShowAIChat(true);
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
      {/* Auto-Unpublished Warning Banner */}
      {wasAutoUnpublished && process?.status === 'draft' && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-2xl w-full px-4">
          <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4 shadow-lg flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-amber-900 mb-1">Flowchart Updated & Unpublished</h3>
              <p className="text-sm text-amber-800 mb-3">
                Your changes have been saved. This flowchart was unpublished for review. Please review the changes and republish when ready.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => setShowPublishDialog(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Review & Republish
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setWasAutoUnpublished(false)}
                  className="border-amber-600 text-amber-600 hover:bg-amber-50"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="border-b border-slate-200 bg-white px-3 sm:px-6 py-3 sm:py-4 flex-shrink-0">
          {/* Mobile: Two rows, Desktop: One row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            {/* Left side: Back + Title */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Button onClick={() => navigate('/')} variant="ghost" size="sm" data-testid="back-btn" className="flex-shrink-0">
                <ArrowLeft className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-slate-800 truncate">{process.name}</h2>
                  {/* Published Badge - inline with title on mobile */}
                  {process?.status === 'published' && !isEditMode && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-lg flex-shrink-0">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      <span className="text-xs font-medium text-emerald-700">Published</span>
                    </div>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">v{process.version} • {process.nodes?.length || 0} steps</p>
              </div>
            </div>
            
            {/* Right side: Action buttons */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 overflow-x-auto">
              {/* Export Button - Always Available */}
              <Button onClick={() => setShowExportModal(true)} variant="outline" size="sm" data-testid="export-btn" className="flex-shrink-0">
                <Download className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              
              {/* Move to Project Button - Owner Only */}
              {!readOnly && accessLevel === 'owner' && (
                <Button onClick={() => setShowMoveModal(true)} variant="outline" size="sm" className="flex-shrink-0">
                  <FolderInput className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Move</span>
                </Button>
              )}
              
              {/* Refine with AI Button - Always Available for owners */}
              {!readOnly && accessLevel === 'owner' && (
                <Button 
                  onClick={handleOpenAIChat}
                  variant="outline" 
                  size="sm"
                  className="bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border-blue-200 text-blue-700 flex-shrink-0"
                >
                  <MessageSquare className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">AI</span>
                </Button>
              )}
              
              {/* Intelligence Badge Notification - Only shows when intelligence available */}
              {!readOnly && accessLevel === 'owner' && intelligenceBadgeVisible && !showIntelligence && (
                <button
                  onClick={() => setShowIntelligence(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors text-sm font-medium text-amber-700 flex-shrink-0"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {(process?.steps?.length || 0) <= 10 
                      ? `${Math.min(2, intelligence?.issues?.length || 0)} quick tip${Math.min(2, intelligence?.issues?.length || 0) !== 1 ? 's' : ''}`
                      : `${intelligence?.issues?.length || 0} improvement${intelligence?.issues?.length !== 1 ? 's' : ''} found`
                    }
                  </span>
                  <span className="sm:hidden">{intelligence?.issues?.length || 0}</span>
                </button>
              )}
              
              {/* Action Buttons (Hidden in readOnly mode) */}
              {!readOnly && (
                <>
                  {isEditMode ? (
                    /* Edit Mode Buttons */
                    <>
                      <Button 
                        onClick={handleSaveChanges} 
                        disabled={saving}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0"
                      >
                        <Save className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save'}</span>
                      </Button>
                      <Button onClick={handleExitEditMode} variant="outline" size="sm" className="flex-shrink-0">
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    /* View Mode Buttons */
                    <>
                      {!isGuestMode && process?.status === 'published' && (
                        <Button 
                          onClick={handleShare} 
                          variant="default" 
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
                        >
                          {copied ? (
                            <>
                              <Check className="w-4 h-4 sm:mr-2" />
                              <span className="hidden sm:inline">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Share2 className="w-4 h-4 sm:mr-2" />
                              <span className="hidden sm:inline">Share</span>
                            </>
                          )}
                        </Button>
                      )}
                      
                      <Button onClick={handleEnterEditMode} variant="outline" size="sm" className="flex-shrink-0">
                        <Edit3 className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                      
                      {process?.status !== 'published' && (
                        <Button 
                          onClick={() => isGuestMode ? setShowGuestSignupPrompt(true) : setShowPublishDialog(true)} 
                          variant="default" 
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0"
                        >
                          <CheckCircle className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">{isGuestMode ? 'Sign Up to Publish' : 'Publish'}</span>
                        </Button>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Edit Mode Banner - Compact & Elegant (Hidden in Print) */}
        {isEditMode && !readOnly && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-6 py-2.5 print:hidden">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-sm font-medium text-slate-700">
                  Editing Mode
                </span>
              </div>
              <span className="text-xs text-slate-500">
                Click nodes to edit details
              </span>
            </div>
          </div>
        )}

        {/* Main Content Area with Integrated Sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Simple Flowchart */}
          <SimpleFlowchart
            process={process}
            onNodeClick={handleNodeClick}
            selectedNodeId={selectedNode?.id}
            readOnly={readOnly || !isEditMode}
            onAddNode={handleAddNode}
            onDeleteNode={handleDeleteNode}
            onMoveNode={handleMoveNode}
            reordering={reordering}
          />
          
          {/* Integrated Sidebar */}
          <IntegratedSidebar
            selectedNode={selectedNode}
            process={process}
            intelligence={intelligence}
            intelligenceLoading={intelligenceLoading}
            showIntelligence={showIntelligence}
            onCloseNode={() => setSelectedNode(null)}
            onCloseIntelligence={() => setShowIntelligence(false)}
            onUpdateNode={(updatedNode) => {
              setProcess({
                ...process,
                nodes: process.nodes.map(n => n.id === updatedNode.id ? updatedNode : n)
              });
              setHasUnsavedChanges(true);
            }}
            onRefreshIntelligence={loadIntelligence}
            onRegenerateIntelligence={regenerateIntelligence}
            readOnly={readOnly || !isEditMode}
            accessLevel={accessLevel}
            isSimpleProcess={(process?.steps?.length || 0) <= 10}
          />
        </div>
      </div>

      {/* Panels now integrated into sidebar */}

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

      {/* Move to Project Modal */}
      <Dialog open={showMoveModal} onOpenChange={setShowMoveModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Move to Project</DialogTitle>
            <DialogDescription>
              Select a project to move this flowchart
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            {/* Current workspace indicator */}
            {process?.workspaceId && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-2 text-sm">
                  <FolderOpen className="w-4 h-4 text-blue-600" />
                  <span className="text-slate-600">Current project:</span>
                  <span className="font-semibold text-slate-800">
                    {workspaces.find(w => w.id === process.workspaceId)?.name || 'Unknown'}
                  </span>
                </div>
              </div>
            )}

            {/* Workspace grid */}
            <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
              {workspaces
                .filter(ws => ws.id !== process?.workspaceId)
                .map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => handleMoveToWorkspace(workspace)}
                    disabled={movingProcess}
                    className="group p-5 border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                        <FolderOpen className="w-5 h-5 text-white" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-200" />
                    </div>
                    <h3 className="font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                      {workspace.name}
                    </h3>
                    {workspace.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                        {workspace.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {workspace.processCount || 0} flowcharts
                      </Badge>
                    </div>
                  </button>
                ))}
            </div>

            {/* Empty state */}
            {workspaces.filter(ws => ws.id !== process?.workspaceId).length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-600 mb-2">No other projects available</p>
                <p className="text-sm text-slate-500">Create a new project to organize your flowcharts</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMoveModal(false)}
              disabled={movingProcess}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Refine Published Warning Dialog */}
      <Dialog open={showRefineWarning} onOpenChange={setShowRefineWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-600" />
              </div>
              Refine Published Flowchart?
            </DialogTitle>
            <DialogDescription className="pt-4">
              This flowchart is currently <strong>published and shared</strong>. Using AI refinement will:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs text-blue-600 font-bold">1</span>
              </div>
              <p className="text-sm text-slate-700">Save your AI-powered changes</p>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs text-amber-600 font-bold">2</span>
              </div>
              <p className="text-sm text-slate-700">
                <strong>Unpublish</strong> the flowchart temporarily
              </p>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs text-green-600 font-bold">3</span>
              </div>
              <p className="text-sm text-slate-700">
                Allow you to <strong>review changes</strong> before republishing
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>💡 Why?</strong> This ensures quality control - you can review AI changes before sharing them with your team.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefineWarning(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmRefine}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Continue to Refine
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guest Signup Prompt */}
      <Dialog open={showGuestSignupPrompt} onOpenChange={setShowGuestSignupPrompt}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="w-6 h-6 text-blue-600" />
              Sign Up to Save & Share
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              You've created an amazing flowchart! To save, publish, and share it with your team, you'll need to create a free account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <p className="text-sm font-semibold text-blue-900 mb-2">
              What you'll get with a free account:
            </p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Save unlimited flowcharts</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Publish & share with your team</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>AI-powered process intelligence</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Export to PDF and share links</span>
              </li>
            </ul>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowGuestSignupPrompt(false)}
            >
              Maybe Later
            </Button>
            <Button
              onClick={() => navigate('/signup')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Create Free Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Refine Chat */}
      {showAIChat && (
        <AIRefineChat
          processId={id}
          onClose={() => setShowAIChat(false)}
          onRefineComplete={handleRefineComplete}
        />
      )}
    </div>
  );
};

export default FlowchartEditor;
