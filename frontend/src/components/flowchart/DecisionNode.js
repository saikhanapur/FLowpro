import React from 'react';
import { Handle, Position } from 'reactflow';
import { HelpCircle } from 'lucide-react';

const DecisionNode = ({ data, selected }) => {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-2 !h-2 !border-none" />
      
      {/* EROAD Design: Clean white card with orange border for decisions */}
      <div 
        className={`
          relative
          bg-white rounded-lg
          border-2 border-orange-400
          shadow-sm hover:shadow-md
          transition-all duration-200
          ${selected ? 'ring-2 ring-orange-300 ring-offset-2' : ''}
          w-60
        `}
        style={{
          width: '240px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}
      >
        {/* Generous padding */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <h3 className="text-slate-900 font-medium text-sm leading-tight">
              {data.title || 'Decision'}
            </h3>
          </div>
          
          {/* Description if exists */}
          {data.description && (
            <p className="text-slate-600 text-xs leading-relaxed">
              {data.description}
            </p>
          )}

          {/* Yes/No indicators */}
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-green-600 font-medium">✓ Yes</span>
            <span className="text-red-600 font-medium">✗ No</span>
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
