import React, { useState } from 'react';
import { FolderOpen, Plus, Settings, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Input } from '@/components/ui/input';
import { api } from '@/utils/api';
import { toast } from 'sonner';

const WorkspaceSelector = ({ currentWorkspace, workspaces, onWorkspaceChange, onWorkspacesUpdate }) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    setCreating(true);
    try {
      const workspace = {
        name: newWorkspaceName.trim(),
        description: newWorkspaceDesc.trim(),
        color: 'blue',
        icon: 'folder',
        processCount: 0,
        isDefault: false
      };

      await api.createWorkspace(workspace);
      toast.success('Project created!');
      setShowCreateDialog(false);
      setNewWorkspaceName('');
      setNewWorkspaceDesc('');
      onWorkspacesUpdate();
    } catch (error) {
      toast.error('Failed to create project');
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  if (!currentWorkspace) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <FolderOpen className="w-4 h-4" />
            <span className="font-medium">{currentWorkspace.name}</span>
            <span className="text-xs text-slate-500">({currentWorkspace.processCount})</span>
            <ChevronDown className="w-4 h-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase">
            Workspaces
          </div>
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => onWorkspaceChange(workspace)}
              className={`cursor-pointer ${
                workspace.id === currentWorkspace.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  <span>{workspace.name}</span>
                </div>
                <span className="text-xs text-slate-500">{workspace.processCount}</span>
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowCreateDialog(true)} className="cursor-pointer">
            <Plus className="w-4 h-4 mr-2" />
            <span>Create Workspace</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Workspace Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
            <DialogDescription>
              Organize your processes into separate workspaces for teams, projects, or departments.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Workspace Name *</label>
              <Input
                placeholder="e.g., HR Department, Client XYZ, IT Operations"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateWorkspace()}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
              <Input
                placeholder="Brief description of this workspace"
                value={newWorkspaceDesc}
                onChange={(e) => setNewWorkspaceDesc(e.target.value)}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>💡 Tip:</strong> Create workspaces to separate processes by team, client, or project for better organization.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWorkspace} disabled={creating}>
              {creating ? 'Creating...' : 'Create Workspace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WorkspaceSelector;
