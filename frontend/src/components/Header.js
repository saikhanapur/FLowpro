import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Menu, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WorkspaceSelector from './WorkspaceSelector';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Header = ({ theme, onThemeChange, currentWorkspace, workspaces, onWorkspaceChange, onWorkspacesUpdate }) => {
  const navigate = useNavigate();

  const themes = [
    { id: 'minimalist', name: 'Minimalist' },
    { id: 'dark', name: 'Dark Mode' },
    { id: 'executive', name: 'Executive' },
    { id: 'technical', name: 'Technical' },
  ];

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate('/')}
          data-testid="header-logo"
        >
          <div className="w-10 h-10 rounded-lg gradient-blue flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold heading-font bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            FlowForge AI
          </h1>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <button
            onClick={() => navigate('/')}
            className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
            data-testid="nav-processes"
          >
            My Processes
          </button>
          <button
            onClick={() => navigate('/templates')}
            className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
            data-testid="nav-templates"
          >
            Templates
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" data-testid="theme-selector">
                <Settings className="w-4 h-4 mr-2" />
                Theme
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {themes.map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  onClick={() => onThemeChange(t.id)}
                  data-testid={`theme-${t.id}`}
                >
                  {t.name} {theme === t.id && '✓'}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => navigate('/')}>
                My Processes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/templates')}>
                Templates
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
