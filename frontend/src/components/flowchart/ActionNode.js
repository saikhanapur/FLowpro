import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { CheckCircle, AlertTriangle } from 'lucide-react';

const ActionNode = ({ data, selected }) => {
  const [showDetails, setShowDetails] = useState(false);

  // Determine node status
  const isCritical = data.status === 'warning' || data.title?.toLowerCase().includes('critical');
  const isActive = data.status === 'active';
  const isComplete = data.status === 'complete' || data.type === 'end';
  
  // EROAD Design: Status-based styling
  const getNodeStyle = () => {
    if (isCritical) {
      return {
        borderColor: '#FF3B30',
        backgroundColor: '#FFE5E5',
        icon: <AlertTriangle className="w-4 h-4 text-red-600" />
      };
    }
    if (isComplete) {
      return {
        borderColor: '#34C759',
        backgroundColor: '#E8F8ED',
        icon: <CheckCircle className="w-4 h-4 text-green-600" />
      };
    }
    return {
      borderColor: '#CCCCCC',
      backgroundColor: '#FFFFFF',
      icon: null
    };
  };

  const style = getNodeStyle();

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2.5 !h-2.5 !border-none" />
      
      {/* EROAD Design: Clean card with status-based coloring */}
      <div 
        className="group relative rounded-xl transition-shadow duration-200"
        style={{
          width: '280px',
          border: `2px solid ${style.borderColor}`,
          backgroundColor: style.backgroundColor,
          boxShadow: selected ? '0 4px 12px rgba(0, 0, 0, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.08)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}
        onMouseEnter={() => setShowDetails(true)}
        onMouseLeave={() => setShowDetails(false)}
      >
        {/* EROAD Generous Padding */}
        <div className="px-6 py-5">
          {/* Title with Icon */}
          <div className="flex items-start gap-2 mb-2">
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
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-2.5 !h-2.5 !border-none" />
    </>
  );
};

export default ActionNode;
