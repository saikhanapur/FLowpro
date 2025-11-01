import React from 'react';
import { Handle, Position } from 'reactflow';
import { AlertTriangle } from 'lucide-react';

const DecisionNode = ({ data, selected }) => {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-orange-400 !w-2 !h-2" />
      
      {/* Minimalist Diamond Design */}
      <div 
        className={`
          relative w-40 h-40 transform rotate-45
          bg-gradient-to-br from-orange-400 to-orange-500
          shadow-xl hover:shadow-2xl
          transition-all duration-300
          ${selected ? 'ring-4 ring-orange-300 ring-offset-4' : ''}
        `}
      >
        {/* Content Container (rotated back) */}
        <div className="absolute inset-0 flex items-center justify-center transform -rotate-45 p-4">
          <div className="text-center">
            <AlertTriangle className="w-5 h-5 text-white mx-auto mb-2" />
            <h3 className="text-white font-bold text-sm leading-tight">
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
