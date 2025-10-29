import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Eye, Edit, Trash2, Share, Calendar, FolderInput, CheckSquare, Square, FolderOpen, X, ArrowRight } from 'lucide-react';
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

const Dashboard = ({ currentWorkspace, workspaces, onWorkspacesUpdate }) => {
  const navigate = useNavigate();
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedProcesses, setSelectedProcesses] = useState([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [movingProcesses, setMovingProcesses] = useState(false);

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
  }, [currentWorkspace]); // Reload when workspace changes

  const loadProcesses = async () => {
    if (!currentWorkspace) return;
    
    setLoading(true);
    try {
      const data = await api.getProcesses();
      // Filter processes by current workspace
      const filtered = data.filter(p => p.workspaceId === currentWorkspace.id);
      setProcesses(filtered);
    } catch (error) {
      toast.error('Failed to load processes');
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

  const filteredProcesses = processes.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || p.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

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
      {/* Hero Section */}
      <div className="text-center mb-16 relative">
        {/* Animated background gradient */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>

        <h1 className="text-6xl md:text-7xl font-bold heading-font mb-6 leading-tight">
          <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-transparent">
            Turn Chaos into Clarity
          </span>
          <br />
          <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
            in 2 Minutes
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
          Document, visualize, and improve your workflows with AI
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <Button
            size="lg"
            onClick={() => navigate('/create')}
            className="gradient-blue text-white text-lg px-10 py-7 rounded-2xl shadow-2xl hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300 btn-hover group"
            data-testid="create-process-btn"
          >
            <Plus className="w-6 h-6 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            Create Your First Process
          </Button>
          
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate('/templates')}
            className="text-lg px-10 py-7 rounded-2xl border-2 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300"
          >
            Browse Templates
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span>Voice, Document, or Chat Input</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>AI-Powered Gap Detection</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
            <span>Export Anywhere</span>
          </div>
        </div>
      </div>

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
        
        {/* Multi-select toggle */}
        <Button
          variant={selectMode ? 'default' : 'outline'}
          onClick={toggleSelectMode}
          className={`gap-2 transition-all duration-300 ${selectMode ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
          data-testid="select-mode-btn"
        >
          {selectMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          Select
        </Button>
      </div>

      {/* Process Grid */}
      {filteredProcesses.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-12 h-12 text-slate-400" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">
            No processes yet
          </h3>
          <p className="text-slate-600 mb-6">
            Create your first process to get started
          </p>
          <Button
            onClick={() => navigate('/create')}
            data-testid="empty-state-create-btn"
          >
            Create Process
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProcesses.map((process) => (
            <Card
              key={process.id}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer fade-in"
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
  );
};

export default Dashboard;
