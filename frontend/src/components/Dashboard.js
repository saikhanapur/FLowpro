import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Eye, Edit, Trash2, Share, Calendar, FolderInput, CheckSquare, Square, FolderOpen, X, ArrowRight, FolderPlus, Sparkles, ChevronDown, ChevronRight, MoreVertical, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from '@/utils/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = ({ currentWorkspace, workspaces, onWorkspacesUpdate }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [processes, setProcesses] = useState([]);
  const [allProcesses, setAllProcesses] = useState([]); // Track ALL user processes
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(true);
  
  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedProcesses, setSelectedProcesses] = useState([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [movingProcesses, setMovingProcesses] = useState(false);
  
  // Create project state
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState('');
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  
  // Project management state
  const [collapsedProjects, setCollapsedProjects] = useState(new Set());
  const [editingProject, setEditingProject] = useState(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false);
  const [deletingProject, setDeletingProject] = useState(null);

  // Helper function to format published date
  const formatPublishedDate = (dateString) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Published today';
    if (diffDays === 1) return 'Published yesterday';
    if (diffDays < 7) return `Published ${diffDays} days ago`;
    if (diffDays < 30) return `Published ${Math.floor(diffDays / 7)} weeks ago`;
    
    // Format as "Published Jan 15, 2025"
    return `Published ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  useEffect(() => {
    loadProcesses();
  }, []); // Load on mount only

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch();
      } else {
        loadProcesses(); // Reset to all processes when search is empty
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, filterStatus]);

  const loadProcesses = async () => {
    setLoading(true);
    try {
      const data = await api.getProcesses();
      
      // Store ALL processes for empty state check
      setAllProcesses(data);
      
      // Filter by status if needed (no workspace filtering - show all)
      const filtered = filterStatus === 'all' ? data : data.filter(p => p.status === filterStatus);
      setProcesses(filtered);
      
      // Auto-collapse empty projects
      if (workspaces && workspaces.length > 0) {
        const emptyProjects = workspaces
          .filter(ws => !data.some(p => p.workspaceId === ws.id))
          .map(ws => ws.id);
        setCollapsedProjects(new Set(emptyProjects));
      }
    } catch (error) {
      toast.error('Failed to load processes');
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async () => {
    console.log('🔍 Performing search with:', { 
      query: searchQuery.trim(), 
      workspace: null, // ALWAYS search across ALL workspaces
      status: filterStatus === 'all' ? null : filterStatus 
    });
    
    setLoading(true);
    try {
      const data = await api.searchProcesses(
        searchQuery.trim(), 
        null, // Don't filter by workspace for search
        filterStatus === 'all' ? null : filterStatus
      );
      console.log('🔍 Search results:', data);
      setProcesses(data);
    } catch (error) {
      console.error('❌ Search error:', error);
      toast.error('Failed to search processes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this process?')) return;
    
    try {
      await api.deleteProcess(id);
      toast.success('Process deleted');
      loadProcesses();
    } catch (error) {
      toast.error('Failed to delete process');
    }
  };

  // Multi-select functions
  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    setSelectedProcesses([]);
  };

  const toggleProcessSelection = (processId) => {
    setSelectedProcesses(prev => 
      prev.includes(processId) 
        ? prev.filter(id => id !== processId)
        : [...prev, processId]
    );
  };

  const selectAll = () => {
    setSelectedProcesses(filteredProcesses.map(p => p.id));
  };

  const deselectAll = () => {
    setSelectedProcesses([]);
  };

  const handleMoveToWorkspace = async (targetWorkspace) => {
    if (selectedProcesses.length === 0) return;

    setMovingProcesses(true);
    try {
      // Move all selected processes
      await Promise.all(
        selectedProcesses.map(processId => 
          api.moveProcessToWorkspace(processId, targetWorkspace.id)
        )
      );

      toast.success(`${selectedProcesses.length} process${selectedProcesses.length > 1 ? 'es' : ''} moved to ${targetWorkspace.name}`);
      
      // Reset selection and reload
      setSelectedProcesses([]);
      setSelectMode(false);
      setShowMoveModal(false);
      
      // Reload processes and update workspace counts
      await loadProcesses();
      if (onWorkspacesUpdate) {
        onWorkspacesUpdate();
      }
    } catch (error) {
      toast.error('Failed to move processes');
      console.error(error);
    } finally {
      setMovingProcesses(false);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) {
      toast.error('Please enter a workspace name');
      return;
    }

    setCreatingWorkspace(true);
    try {
      const newWorkspace = await api.createWorkspace({
        name: newWorkspaceName.trim(),
        description: newWorkspaceDesc.trim() || `${newWorkspaceName} workspace`
      });

      toast.success(`Project "${newWorkspaceName}" created!`);
      
      // Reset form
      setNewWorkspaceName('');
      setNewWorkspaceDesc('');
      setShowCreateWorkspaceModal(false);
      
      // Refresh workspaces
      if (onWorkspacesUpdate) {
        onWorkspacesUpdate();
      }
    } catch (error) {
      toast.error('Failed to create project');
      console.error(error);
    } finally {
      setCreatingWorkspace(false);
    }
  };

  const toggleProjectCollapse = (projectId) => {
    setCollapsedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const handleEditProject = async (projectId) => {
    if (!editProjectName.trim()) {
      toast.error('Project name cannot be empty');
      return;
    }

    try {
      await api.updateWorkspace(projectId, {
        name: editProjectName.trim()
      });
      toast.success('Project renamed!');
      setEditingProject(null);
      setEditProjectName('');
      if (onWorkspacesUpdate) {
        onWorkspacesUpdate();
      }
    } catch (error) {
      toast.error('Failed to rename project');
      console.error(error);
    }
  };

  const handleDeleteProject = async () => {
    if (!deletingProject) return;

    try {
      await api.deleteWorkspace(deletingProject.id);
      toast.success('Project deleted!');
      setShowDeleteProjectModal(false);
      setDeletingProject(null);
      if (onWorkspacesUpdate) {
        onWorkspacesUpdate();
      }
      loadProcesses(); // Reload processes
    } catch (error) {
      toast.error('Failed to delete project');
      console.error(error);
    }
  };

  const filteredProcesses = processes; // Using backend search/filtering now

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading processes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8" data-testid="dashboard">
      {/* Dashboard Header with Create Button */}
      {allProcesses.length > 0 && (
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                My Workspace
              </h1>
              <p className="text-base md:text-lg text-slate-600">
                {allProcesses.length} flowchart{allProcesses.length !== 1 ? 's' : ''} across {workspaces.length} project{workspaces.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <Button
                onClick={() => navigate('/create')}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
                data-testid="create-process-btn"
              >
                <Plus className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className="truncate">Create Flowchart</span>
              </Button>
              <Button
                onClick={() => setShowCreateWorkspaceModal(true)}
                variant="outline"
                size="lg"
                className="px-6 py-6 text-base font-semibold w-full sm:w-auto"
              >
                <FolderPlus className="w-5 h-5 mr-2 flex-shrink-0" />
                New Project
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-8 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 relative w-full">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <Input
            placeholder="Search processes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="search-input"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('all')}
            data-testid="filter-all"
          >
            All
          </Button>
          <Button
            variant={filterStatus === 'draft' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('draft')}
            data-testid="filter-draft"
          >
            Draft
          </Button>
          <Button
            variant={filterStatus === 'published' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('published')}
            data-testid="filter-published"
          >
            Published
          </Button>
        </div>
      </div>

      {/* Process Grid */}
      {allProcesses.length === 0 ? (
        // TRUE EMPTY STATE: User has NO processes at all
        <div className="text-center py-20">
          <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <div className="text-5xl">✨</div>
          </div>
          <h2 className="text-4xl font-bold text-slate-900 mb-3">
            Turn Chaos into Clarity
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              in 2 Minutes
            </span>
          </h2>
          <p className="text-lg text-slate-600 mb-8 max-w-md mx-auto">
            Document, visualize, and improve your workflows with AI
          </p>
          <Button
            onClick={() => navigate('/create')}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-6 text-lg font-semibold shadow-lg"
            data-testid="empty-state-create-btn"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create an Interactive Flowchart
          </Button>
          <p className="text-sm text-slate-500 mt-4">
            Start with voice, document, or chat input
          </p>
        </div>
      ) : filteredProcesses.length === 0 ? (
        // FILTERED EMPTY: User has processes but none match current filter
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">
            No flowcharts found
          </h3>
          <p className="text-slate-600 mb-6">
            {searchQuery ? `No flowcharts match "${searchQuery}"` : 'No flowcharts match your filters'}
          </p>
          <Button
            onClick={() => {
              setSearchQuery('');
              setFilterStatus('all');
            }}
            variant="outline"
          >
            Clear Search
          </Button>
        </div>
      ) : (
        // Group processes by workspace/project - show projects WITH flowcharts first, then empty ones
        <div className="space-y-6">
          {workspaces
            .sort((a, b) => {
              const aCount = filteredProcesses.filter(p => p.workspaceId === a.id).length;
              const bCount = filteredProcesses.filter(p => p.workspaceId === b.id).length;
              // Projects with flowcharts first, then empty ones
              if (aCount > 0 && bCount === 0) return -1;
              if (aCount === 0 && bCount > 0) return 1;
              return 0;
            })
            .map((workspace) => {
              const workspaceProcesses = filteredProcesses.filter(p => p.workspaceId === workspace.id);
              const isCollapsed = collapsedProjects.has(workspace.id);
              const isEmpty = workspaceProcesses.length === 0;
              
              return (
                <div key={workspace.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                  {/* Project Header - Collapsible */}
                  <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div 
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => toggleProjectCollapse(workspace.id)}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-600" />
                      )}
                      <FolderOpen className="w-5 h-5 text-slate-600" />
                      
                      {editingProject === workspace.id ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={editProjectName}
                            onChange={(e) => setEditProjectName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditProject(workspace.id);
                              if (e.key === 'Escape') {
                                setEditingProject(null);
                                setEditProjectName('');
                              }
                            }}
                            className="h-8 w-64"
                            autoFocus
                          />
                          <Button size="sm" onClick={() => handleEditProject(workspace.id)}>
                            Save
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => {
                              setEditingProject(null);
                              setEditProjectName('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <h2 className="text-base md:text-xl font-bold text-slate-900 truncate max-w-[140px] sm:max-w-[250px] md:max-w-none">{workspace.name}</h2>
                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                            {workspaceProcesses.length} flowchart{workspaceProcesses.length !== 1 ? 's' : ''}
                          </Badge>
                        </>
                      )}
                    </div>
                    
                    {/* Project Actions */}
                    {editingProject !== workspace.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingProject(workspace.id);
                              setEditProjectName(workspace.name);
                            }}
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Rename Project
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setDeletingProject(workspace);
                              setShowDeleteProjectModal(true);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  
                  {/* Project Content - Collapsible */}
                  {!isCollapsed && (
                    <div className="px-4 pb-4">
                      {isEmpty ? (
                        <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Plus className="w-6 h-6 text-blue-600" />
                          </div>
                          <p className="text-sm text-slate-600 mb-3">
                            No flowcharts yet
                          </p>
                          <Button
                            size="sm"
                            onClick={() => navigate('/create')}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Flowchart
                          </Button>
                        </div>
                      ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {workspaceProcesses.map((process) => (
                            <Card
                              key={process.id}
                              className="p-6 hover:shadow-lg transition-all cursor-pointer fade-in relative"
                              onClick={() => navigate(`/edit/${process.id}`)}
                              data-testid={`process-card-${process.id}`}
                            >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-slate-800 mb-1">
                            {process.name}
                          </h3>
                          <p className="text-sm text-slate-600 line-clamp-2">
                            {process.description || 'No description'}
                          </p>
                        </div>
                        <Badge 
                          variant={process.status === 'published' ? 'default' : 'secondary'}
                          className={process.status === 'published' ? 'bg-emerald-600' : ''}
                        >
                          {process.status === 'published' ? '✓ Published' : 'Draft'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {process.views || 0}
                        </span>
                        <span>
                          {process.nodes?.length || 0} steps
                        </span>
                        <span>
                          v{process.version}
                        </span>
                      </div>

                      {/* Published Date - only show for published processes */}
                      {process.status === 'published' && process.publishedAt && (
                        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg mb-4 w-fit">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="font-medium">{formatPublishedDate(process.publishedAt)}</span>
                        </div>
                      )}

                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/edit/${process.id}`)}
                          data-testid={`edit-btn-${process.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(process.id)}
                          data-testid={`delete-btn-${process.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
      
      {/* Floating Action Bar - appears when items are selected */}
      {selectMode && selectedProcesses.length > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 flex items-center gap-6 min-w-[500px]">
            {/* Selection info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {selectedProcesses.length} selected
                </p>
                <button
                  onClick={deselectAll}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear selection
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="h-12 w-px bg-slate-200"></div>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-1">
              <Button
                onClick={() => setShowMoveModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-6 py-5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                data-testid="move-to-workspace-btn"
              >
                <FolderInput className="w-4 h-4" />
                Move to Workspace
              </Button>

              {filteredProcesses.length === selectedProcesses.length ? (
                <Button
                  variant="ghost"
                  onClick={deselectAll}
                  className="gap-2"
                >
                  <Square className="w-4 h-4" />
                  Deselect All
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={selectAll}
                  className="gap-2"
                >
                  <CheckSquare className="w-4 h-4" />
                  Select All
                </Button>
              )}
            </div>

            {/* Close button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSelectMode}
              className="rounded-lg"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Workspace Picker Modal */}
      <Dialog open={showMoveModal} onOpenChange={setShowMoveModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Move to Workspace</DialogTitle>
            <DialogDescription>
              Select a workspace to move {selectedProcesses.length} process{selectedProcesses.length > 1 ? 'es' : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            {/* Current workspace indicator */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center gap-2 text-sm">
                <FolderOpen className="w-4 h-4 text-blue-600" />
                <span className="text-slate-600">Current workspace:</span>
                <span className="font-semibold text-slate-800">{currentWorkspace?.name}</span>
              </div>
            </div>

            {/* Workspace grid */}
            <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
              {workspaces
                ?.filter(ws => ws.id !== currentWorkspace?.id)
                .map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => handleMoveToWorkspace(workspace)}
                    disabled={movingProcesses}
                    className="group p-5 border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid={`workspace-option-${workspace.id}`}
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
                        {workspace.processCount} processes
                      </Badge>
                    </div>
                  </button>
                ))}
            </div>

            {/* Empty state */}
            {workspaces?.filter(ws => ws.id !== currentWorkspace?.id).length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-600 mb-2">No other workspaces available</p>
                <p className="text-sm text-slate-500">Create a new workspace to organize your processes</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMoveModal(false)}
              disabled={movingProcesses}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Project Modal */}
      <Dialog open={showCreateWorkspaceModal} onOpenChange={setShowCreateWorkspaceModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Organize your flowcharts into projects for teams, clients, or departments
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Project Name *
              </label>
              <Input
                placeholder="e.g., Marketing Team, Client ABC, Q4 Operations"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Description (Optional)
              </label>
              <Input
                placeholder="Brief description of this project"
                value={newWorkspaceDesc}
                onChange={(e) => setNewWorkspaceDesc(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateWorkspaceModal(false);
                setNewWorkspaceName('');
                setNewWorkspaceDesc('');
              }}
              disabled={creatingWorkspace}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateWorkspace}
              disabled={creatingWorkspace || !newWorkspaceName.trim()}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              {creatingWorkspace ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation Modal */}
      <Dialog open={showDeleteProjectModal} onOpenChange={setShowDeleteProjectModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Delete Project?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingProject?.name}"?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {deletingProject && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Warning:</strong> This will permanently delete this project. 
                  {filteredProcesses.filter(p => p.workspaceId === deletingProject.id).length > 0 && (
                    <span> All {filteredProcesses.filter(p => p.workspaceId === deletingProject.id).length} flowchart(s) in this project will also be deleted.</span>
                  )}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteProjectModal(false);
                setDeletingProject(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteProject}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
