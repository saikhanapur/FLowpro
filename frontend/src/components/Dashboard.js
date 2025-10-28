import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Eye, Edit, Trash2, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/utils/api';
import { toast } from 'sonner';

const Dashboard = () => {
  const navigate = useNavigate();
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadProcesses();
  }, []);

  const loadProcesses = async () => {
    try {
      const data = await api.getProcesses();
      setProcesses(data);
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
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold heading-font text-slate-800 mb-4">
          Transform Your Process into a Flowchart in 2 Minutes
        </h1>
        <p className="text-xl text-slate-600 mb-8">
          Document, visualize, and improve your workflows with AI
        </p>
        <Button
          size="lg"
          onClick={() => navigate('/create')}
          className="gradient-blue text-white text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all btn-hover"
          data-testid="create-process-btn"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create New Process
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <Input
            placeholder="Search processes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="search-input"
          />
        </div>
        <div className="flex gap-2">
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
                <Badge variant={process.status === 'published' ? 'default' : 'secondary'}>
                  {process.status}
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
