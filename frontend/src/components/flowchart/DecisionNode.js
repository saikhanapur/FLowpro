import React from 'react';
import { Handle, Position } from 'reactflow';
import { AlertTriangle } from 'lucide-react';

const DecisionNode = ({ data, selected }) => {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-2 !h-2 !border-none" />
      
      {/* SMALLER, Proportional Diamond - Matches node family */}
      <div 
        className={`
          relative w-32 h-32 transform rotate-45
          bg-gradient-to-br from-orange-400 to-orange-500
          border-2 border-orange-600
          shadow-lg hover:shadow-xl
          transition-all duration-300
          ${selected ? 'ring-4 ring-orange-300 ring-offset-4 scale-105' : ''}
        `}
      >
        {/* Content Container (rotated back) */}
        <div className="absolute inset-0 flex items-center justify-center transform -rotate-45 p-3">
          <div className="text-center">
            <AlertTriangle className="w-4 h-4 text-white mx-auto mb-1.5" />
            <h3 className="text-white font-semibold text-xs leading-tight px-1">
              {data.title || 'Decision'}
            </h3>
          </div>
        </div>
      </div>

      {/* YES Branch - Right */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="yes"
        className="!bg-green-500 !w-3 !h-3 !border-2 !border-white"
        style={{ top: '50%', right: '-6px' }}
      />

      {/* NO Branch - Bottom */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="no"
        className="!bg-red-500 !w-3 !h-3 !border-2 !border-white"
        style={{ left: '50%', bottom: '-6px' }}
      />
    </>
  );
};

export default DecisionNode;
