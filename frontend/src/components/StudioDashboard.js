import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Search, Zap, Trash2, Eye, Film, Rocket, Target, Wand2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import StudioHeader from './StudioHeader';

const StudioDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [processes, setProcesses] = useState([]);
  const [allProcesses, setAllProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Studio management
  const [studios, setStudios] = useState([]);
  const [currentStudio, setCurrentStudio] = useState(null);
  const [showCreateStudioModal, setShowCreateStudioModal] = useState(false);
  const [newStudioName, setNewStudioName] = useState('');
  const [newStudioDesc, setNewStudioDesc] = useState('');
  const [creatingStudio, setCreatingStudio] = useState(false);

  const studioIcons = ['🎭', '🎪', '🎬', '🎨', '🎯', '🔮', '🌟', '⚡', '🚀', '💫'];

  useEffect(() => {
    loadStudios();
  }, []);

  useEffect(() => {
    if (currentStudio) {
      loadProcesses();
    }
  }, [currentStudio]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch();
      } else {
        loadProcesses();
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, filterStatus]);

  const loadStudios = async () => {
    try {
      const data = await api.getWorkspaces(); // Reusing workspace API
      setStudios(data);
      if (data.length > 0) {
        setCurrentStudio(data[0]);
      }
    } catch (error) {
      toast.error('Failed to load studios');
    }
  };

  const loadProcesses = async () => {
    setLoading(true);
    try {
      const data = await api.getProcesses();
      setAllProcesses(data);
      
      // Filter by current studio
      const studioProcesses = currentStudio 
        ? data.filter(p => p.workspaceId === currentStudio.id)
        : data;
      
      const filtered = filterStatus === 'all' ? studioProcesses : studioProcesses.filter(p => p.status === filterStatus);
      setProcesses(filtered);
    } catch (error) {
      toast.error('Failed to load flows');
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async () => {
    try {
      const data = await api.searchProcesses(searchQuery);
      const filtered = filterStatus === 'all' ? data : data.filter(p => p.status === filterStatus);
      setProcesses(filtered);
    } catch (error) {
      toast.error('Search failed');
    }
  };

  const handleStudioChange = (studio) => {
    setCurrentStudio(studio);
  };

  const handleCreateStudio = async () => {
    if (!newStudioName.trim()) {
      toast.error('Studio name is required');
      return;
    }

    setCreatingStudio(true);
    try {
      const newStudio = await api.createWorkspace({
        name: newStudioName.trim(),
        description: newStudioDesc.trim() || `${newStudioName} studio`
      });

      toast.success(`Studio "${newStudioName}" created! 🎬`);
      setNewStudioName('');
      setNewStudioDesc('');
      setShowCreateStudioModal(false);
      await loadStudios();
      setCurrentStudio(newStudio);
    } catch (error) {
      toast.error('Failed to create studio');
    } finally {
      setCreatingStudio(false);
    }
  };

  const handleDeleteProcess = async (processId, e) => {
    e.stopPropagation();
    if (window.confirm('Delete this flow? This action cannot be undone.')) {
      try {
        await api.deleteProcess(processId);
        toast.success('Flow deleted');
        loadProcesses();
      } catch (error) {
        toast.error('Failed to delete flow');
      }
    }
  };

  const getStudioIcon = (index) => {
    return studioIcons[index % studioIcons.length];
  };

  if (loading && !currentStudio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/30">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 font-medium">Loading your studios...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/30">
      <StudioHeader 
        currentStudio={currentStudio}
        studios={studios}
        onStudioChange={handleStudioChange}
        onCreateStudio={() => setShowCreateStudioModal(true)}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Studio Info & Create Button */}
        {currentStudio && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="text-6xl">{getStudioIcon(studios.findIndex(s => s.id === currentStudio.id))}</div>
                <div>
                  <h1 className="text-4xl font-bold text-slate-900 mb-1">
                    {currentStudio.name}
                  </h1>
                  <p className="text-lg text-slate-600">
                    {processes.length} flow{processes.length !== 1 ? 's' : ''} in this studio
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-8 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 relative w-full">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <Input
              placeholder="Search your flows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 rounded-full border-2 border-slate-200 focus:border-purple-400 transition-all"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('all')}
              className={`rounded-full ${filterStatus === 'all' ? 'bg-gradient-to-r from-purple-600 to-pink-600' : ''}`}
            >
              All
            </Button>
            <Button
              variant={filterStatus === 'draft' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('draft')}
              className={`rounded-full ${filterStatus === 'draft' ? 'bg-gradient-to-r from-purple-600 to-pink-600' : ''}`}
            >
              🎨 Crafting
            </Button>
            <Button
              variant={filterStatus === 'published' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('published')}
              className={`rounded-full ${filterStatus === 'published' ? 'bg-gradient-to-r from-purple-600 to-pink-600' : ''}`}
            >
              ✨ Live
            </Button>
          </div>
        </div>

        {/* Process Grid */}
        {!currentStudio && studios.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-8xl mb-6 animate-bounce">🎬</div>
            <h2 className="text-4xl font-bold text-slate-900 mb-3">
              Welcome to Studio Mode!
            </h2>
            <p className="text-lg text-slate-600 mb-8 max-w-md mx-auto">
              Create your first studio and start sparking flows
            </p>
            <Button
              onClick={() => setShowCreateStudioModal(true)}
              size="lg"
              className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-8 py-6 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Open Your First Studio
            </Button>
          </div>
        ) : processes.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-32 h-32 bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <div className="text-6xl">✨</div>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-3">
              Your Studio Awaits
            </h2>
            <p className="text-lg text-slate-600 mb-8 max-w-md mx-auto">
              Spark your first flow and watch complexity dissolve into clarity
            </p>
            <Button
              onClick={() => navigate('/create')}
              size="lg"
              className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-8 py-6 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Spark Your First Flow
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processes.map((process) => (
              <Card
                key={process.id}
                className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group relative overflow-hidden rounded-2xl border-2 border-slate-200 hover:border-purple-300 bg-white hover:scale-[1.02]"
                onClick={() => navigate(`/edit/${process.id}`)}
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-pink-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-purple-600 transition-colors">
                        {process.name}
                      </h3>
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {process.description || 'No description'}
                      </p>
                    </div>
                    <Badge 
                      variant={process.status === 'published' ? 'default' : 'secondary'}
                      className={`${
                        process.status === 'published' 
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' 
                          : 'bg-amber-100 text-amber-800'
                      } px-3 py-1 rounded-full font-semibold`}
                    >
                      {process.status === 'published' ? '✨ Live' : '🎨 Crafting'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {process.views || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="w-4 h-4" />
                      {process.nodes?.length || 0} stages
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteProcess(process.id, e)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <div className="text-xs text-slate-500">
                      v{process.version || 1}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Studio Modal */}
      <Dialog open={showCreateStudioModal} onOpenChange={setShowCreateStudioModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Open a New Studio
            </DialogTitle>
            <DialogDescription>
              Create a space for your flows. Studios help you organize by team, project, or mission.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Studio Name
              </label>
              <Input
                placeholder="e.g., Product Team, Marketing Ops"
                value={newStudioName}
                onChange={(e) => setNewStudioName(e.target.value)}
                className="h-12 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Description (optional)
              </label>
              <Input
                placeholder="What's this studio for?"
                value={newStudioDesc}
                onChange={(e) => setNewStudioDesc(e.target.value)}
                className="h-12 rounded-lg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateStudioModal(false)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateStudio}
              disabled={creatingStudio || !newStudioName.trim()}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:from-purple-700 hover:to-pink-700"
            >
              {creatingStudio ? 'Creating...' : 'Create Studio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudioDashboard;
