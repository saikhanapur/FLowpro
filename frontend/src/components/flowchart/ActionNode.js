import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { CheckCircle, AlertTriangle, Database, GitBranch, Zap } from 'lucide-react';

const ActionNode = ({ data, selected }) => {
  const [showDetails, setShowDetails] = useState(false);

  // Determine node status
  const isCritical = data.status === 'warning' || data.title?.toLowerCase().includes('critical');
  const isActive = data.status === 'active';
  const isComplete = data.status === 'complete' || data.type === 'end';
  const hasGap = data.gap || data.hasGap;
  
  // EROAD Design: Status-based styling with illumination
  const getNodeStyle = () => {
    if (hasGap || isCritical) {
      return {
        borderColor: '#FF3B30',
        backgroundColor: '#FFE5E5',
        icon: <AlertTriangle className="w-4 h-4 text-red-600" />,
        dotColor: '#FF3B30',
        glow: selected ? '0 0 0 4px rgba(239, 68, 68, 0.1)' : 'none'
      };
    }
    if (isComplete) {
      return {
        borderColor: '#34C759',
        backgroundColor: '#E8F8ED',
        icon: <CheckCircle className="w-4 h-4 text-green-600" />,
        dotColor: '#34C759',
        glow: selected ? '0 0 0 4px rgba(52, 199, 89, 0.1)' : 'none'
      };
    }
    if (isActive) {
      return {
        borderColor: '#007AFF',
        backgroundColor: '#E5F2FF',
        icon: <Zap className="w-4 h-4 text-blue-600" />,
        dotColor: '#007AFF',
        glow: selected ? '0 0 0 4px rgba(0, 122, 255, 0.1)' : 'none'
      };
    }
    return {
      borderColor: '#CCCCCC',
      backgroundColor: '#FFFFFF',
      icon: null,
      dotColor: '#CCCCCC',
      glow: selected ? '0 0 0 4px rgba(0, 0, 0, 0.05)' : 'none'
    };
  };

  const style = getNodeStyle();

  // Determine if this is a database/system node
  const isSystemNode = data.title?.toLowerCase().includes('database') || 
                       data.title?.toLowerCase().includes('system') ||
                       data.title?.toLowerCase().includes('api');

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2.5 !h-2.5 !border-none" />
      
      {/* EROAD Design: Clean card with status-based coloring */}
      <div 
        className="group relative rounded-xl transition-all duration-200"
        style={{
          width: '280px',
          border: `2px solid ${style.borderColor}`,
          backgroundColor: style.backgroundColor,
          boxShadow: selected ? `0 4px 12px rgba(0, 0, 0, 0.15), ${style.glow}` : '0 2px 8px rgba(0, 0, 0, 0.08)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}
        onMouseEnter={() => setShowDetails(true)}
        onMouseLeave={() => setShowDetails(false)}
      >
        {/* EROAD Status Dot - Top Right */}
        <div 
          className="absolute -top-2 -right-2 w-4 h-4 rounded-full border-2 border-white"
          style={{
            backgroundColor: style.dotColor,
            boxShadow: `0 0 8px ${style.dotColor}40`
          }}
        />

        {/* EROAD Generous Padding */}
        <div className="px-6 py-5">
          {/* Title with Icon */}
          <div className="flex items-start gap-2 mb-2">
            {isSystemNode && <Database className="w-4 h-4 text-gray-600 mt-0.5" />}
            {style.icon && <div className="mt-0.5">{style.icon}</div>}
            <h3 className="text-gray-900 font-bold text-base leading-tight flex-1">
              {data.title}
            </h3>
          </div>
          
          {/* Actor/User - Subtitle */}
          {data.actor && (
            <p className="text-gray-600 text-sm mb-3">
              User: {data.actor}
            </p>
          )}

          {/* Description */}
          {data.description && (
            <p className="text-gray-700 text-sm leading-relaxed">
              {data.description}
            </p>
          )}
        </div>

        {/* Gap indicator - Red border on left if gap exists */}
        {hasGap && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-xl" />
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-2.5 !h-2.5 !border-none" />
    </>
  );
};

export default ActionNode;
