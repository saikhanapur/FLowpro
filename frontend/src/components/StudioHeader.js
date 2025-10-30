import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Palette, Settings, User, LogOut, ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const StudioHeader = ({ currentStudio, studios, onStudioChange, onCreateStudio }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const studioIcons = ['🎭', '🎪', '🎬', '🎨', '🎯', '🔮', '🌟', '⚡', '🚀', '💫'];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getStudioIcon = (index) => {
    return studioIcons[index % studioIcons.length];
  };

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-sm backdrop-blur-sm bg-white/90">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate('/studio')}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              SuperHumanly
            </h1>
            <p className="text-[10px] text-slate-500 -mt-1">Studio Mode</p>
          </div>
        </div>

        {/* Center - Studio Selector & Actions */}
        <div className="flex items-center gap-3">
          {/* Studio Selector */}
          {currentStudio && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 px-4 rounded-full border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-all duration-300 shadow-sm hover:shadow-md font-medium"
                >
                  <span className="text-lg mr-2">{getStudioIcon(studios?.findIndex(s => s.id === currentStudio.id) || 0)}</span>
                  <span className="font-semibold text-slate-800">Studio: {currentStudio.name}</span>
                  <ChevronDown className="w-4 h-4 ml-2 text-slate-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-64">
                <div className="px-2 py-2">
                  <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Your Studios</p>
                  {studios?.map((studio, index) => (
                    <DropdownMenuItem
                      key={studio.id}
                      onClick={() => onStudioChange(studio)}
                      className={`cursor-pointer rounded-lg mb-1 ${
                        studio.id === currentStudio.id 
                          ? 'bg-purple-100 text-purple-900 font-semibold' 
                          : 'hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-xl mr-3">{getStudioIcon(index)}</span>
                      <div className="flex-1">
                        <div className="font-medium">{studio.name}</div>
                        <div className="text-xs text-slate-500">{studio.processCount || 0} flows</div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onCreateStudio}
                  className="cursor-pointer font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Open a New Studio
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Spark a Flow Button */}
          <Button
            onClick={() => navigate('/create')}
            className="h-10 px-6 rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <Sparkles className="w-4 h-4 mr-2 relative z-10 group-hover:rotate-12 transition-transform duration-300" />
            <span className="relative z-10">Spark a Flow</span>
          </Button>

          {/* Gallery (Templates) */}
          <Button
            onClick={() => navigate('/templates')}
            variant="ghost"
            className="h-10 px-4 rounded-full hover:bg-purple-50 font-medium text-slate-700 hover:text-purple-600 transition-all duration-300"
          >
            <Palette className="w-4 h-4 mr-2" />
            Gallery
          </Button>
        </div>

        {/* Right - User Menu */}
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-10 w-10 rounded-full p-0 hover:bg-slate-100"
              >
                {user?.picture ? (
                  <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-2">
                <p className="font-semibold text-slate-800">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                <Settings className="w-4 h-4 mr-2" />
                Classic Mode
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
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

export default StudioHeader;
