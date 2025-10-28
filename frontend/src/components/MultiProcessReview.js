import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, FileText, Users, AlertTriangle, ChevronDown, ChevronUp, Combine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/utils/api';
import { toast } from 'sonner';

const MultiProcessReview = ({ processesData, onBack }) => {
  const navigate = useNavigate();
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [creating, setCreating] = useState(false);
  const [selectedProcesses, setSelectedProcesses] = useState(
    processesData.processes.map((_, idx) => idx)
  );

  const handleToggleProcess = (index) => {
    setSelectedProcesses(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index].sort((a, b) => a - b)
    );
  };

  const handleCreateAll = async () => {
    if (selectedProcesses.length === 0) {
      toast.error('Please select at least one process');
      return;
    }

    setCreating(true);
    const loadingToast = toast.loading(`Creating ${selectedProcesses.length} process(es)...`);

    try {
      const createdProcesses = [];

      for (const index of selectedProcesses) {
        const processData = processesData.processes[index];
        
        const process = {
          id: `process-${Date.now()}-${index}`,
          name: processData.processName,
          description: processData.description || '',
          nodes: processData.nodes.map((node, idx) => ({
            ...node,
            position: { x: 100, y: 100 + (idx * 150) }
          })),
          actors: processData.actors || [],
          criticalGaps: processData.criticalGaps || [],
          improvementOpportunities: processData.improvementOpportunities || [],
          status: 'draft',
          theme: 'minimalist',
          healthScore: 85,
          views: 0,
          version: 1
        };

        const created = await api.createProcess(process);
        createdProcesses.push(created);
      }

      toast.dismiss(loadingToast);
      toast.success(`Successfully created ${createdProcesses.length} process(es)! Redirecting to dashboard...`);
      
      // Navigate to dashboard to show all created processes
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to create processes');
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const handleMergeIntoOne = async () => {
    setCreating(true);
    const loadingToast = toast.loading('Merging processes into one...');

    try {
      // Combine all selected processes into one
      const selectedData = selectedProcesses.map(idx => processesData.processes[idx]);
      
      const allNodes = selectedData.flatMap((proc, procIdx) => 
        proc.nodes.map((node, nodeIdx) => ({
          ...node,
          id: `${node.id}-proc${procIdx}`,
          title: `${proc.processName}: ${node.title}`,
          position: { x: 100, y: 100 + ((procIdx * 10 + nodeIdx) * 150) }
        }))
      );

      const allActors = [...new Set(selectedData.flatMap(proc => proc.actors || []))];
      const allGaps = selectedData.flatMap(proc => proc.criticalGaps || []);
      const allOpportunities = selectedData.flatMap(proc => proc.improvementOpportunities || []);

      const mergedProcess = {
        id: `process-${Date.now()}`,
        name: selectedData.map(p => p.processName).join(' & '),
        description: 'Combined process from multiple workflows',
        nodes: allNodes,
        actors: allActors,
        criticalGaps: allGaps,
        improvementOpportunities: allOpportunities,
        status: 'draft',
        theme: 'minimalist',
        healthScore: 80,
        views: 0,
        version: 1
      };

      const created = await api.createProcess(mergedProcess);
      toast.dismiss(loadingToast);
      toast.success('Processes merged successfully!');
      navigate(`/edit/${created.id}`);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to merge processes');
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <Card className="p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-800">
              Found {processesData.processCount} Distinct Processes!
            </h2>
            <p className="text-slate-600">
              Review and select which processes to create
            </p>
          </div>
        </div>

        {/* Summary Alert */}
        <div className="bg-blue-50 rounded-xl p-5 mb-6 border border-blue-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900 mb-1">
                Multiple processes detected in your document
              </p>
              <p className="text-sm text-blue-700">
                Each process will be created as a separate flowchart. You can deselect any you don't need, or merge them into a single process.
              </p>
            </div>
          </div>
        </div>

        {/* Process List */}
        <div className="space-y-4 mb-8">
          {processesData.processes.map((proc, index) => {
            const isExpanded = expandedIndex === index;
            const isSelected = selectedProcesses.includes(index);

            return (
              <Card 
                key={index} 
                className={`p-5 border-2 transition-all ${
                  isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleProcess(index)}
                    className="w-5 h-5 mt-1 cursor-pointer accent-blue-600"
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                            Process {index + 1}/{processesData.processCount}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">
                          {proc.processName}
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {proc.description}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedIndex(isExpanded ? null : index)}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex flex-wrap gap-3 mb-3">
                      <Badge variant="secondary" className="text-xs">
                        <FileText className="w-3 h-3 mr-1" />
                        {proc.nodes?.length || 0} steps
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {proc.actors?.length || 0} people/systems
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {proc.criticalGaps?.length || 0} gaps
                      </Badge>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                        {proc.nodes?.length > 0 && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                              Process Steps
                            </label>
                            <ul className="space-y-1.5">
                              {proc.nodes.slice(0, 5).map((node, idx) => (
                                <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                                  <span className="text-blue-600 font-bold flex-shrink-0">{idx + 1}.</span>
                                  <span>{node.title}</span>
                                </li>
                              ))}
                              {proc.nodes.length > 5 && (
                                <li className="text-sm text-slate-500 italic">
                                  + {proc.nodes.length - 5} more steps...
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Selection Summary */}
        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-slate-700">
            <strong>{selectedProcesses.length}</strong> of <strong>{processesData.processCount}</strong> processes selected
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleCreateAll}
            disabled={creating || selectedProcesses.length === 0}
            className="flex-1"
            size="lg"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            {creating ? 'Creating...' : `Create ${selectedProcesses.length} Process(es) Separately`}
          </Button>

          {selectedProcesses.length > 1 && (
            <Button
              onClick={handleMergeIntoOne}
              disabled={creating}
              variant="outline"
              size="lg"
            >
              <Combine className="w-5 h-5 mr-2" />
              Merge into Single Process
            </Button>
          )}

          <Button onClick={onBack} variant="ghost" size="lg">
            Back
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default MultiProcessReview;
