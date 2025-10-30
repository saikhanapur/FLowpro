import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Menu, Settings, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import WorkspaceSelector from './WorkspaceSelector';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Header = ({ theme, onThemeChange, currentWorkspace, workspaces, onWorkspaceChange, onWorkspacesUpdate }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const themes = [
    { id: 'minimalist', name: 'Minimalist' },
    { id: 'dark', name: 'Dark Mode' },
    { id: 'executive', name: 'Executive' },
    { id: 'technical', name: 'Technical' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate('/dashboard')}
          data-testid="header-logo"
        >
          <div className="w-10 h-10 rounded-lg gradient-blue flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold heading-font bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            SuperHumanly
          </h1>
        </div>

        <nav className="hidden md:flex items-center gap-4">
          <button
            onClick={() => navigate('/templates')}
            className="text-sm text-slate-700 hover:text-slate-900 font-medium transition-colors px-3 py-2 rounded-md hover:bg-slate-100"
            data-testid="nav-templates"
          >
            Templates
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-sm font-medium" data-testid="theme-selector">
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
          
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                {user?.picture ? (
                  <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {user?.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-sm font-medium">{user?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2 py-1.5 text-sm">
                <p className="font-medium">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
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
              <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                My Processes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/templates')}>
                Templates
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
