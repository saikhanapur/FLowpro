import React from 'react';
import { Handle, Position } from 'reactflow';
import { AlertCircle } from 'lucide-react';

const DecisionNode = ({ data, selected }) => {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2.5 !h-2.5 !border-none" />
      
      {/* EROAD Design: Yellow/Warning decision nodes */}
      <div 
        className="rounded-xl transition-shadow duration-200"
        style={{
          width: '280px',
          border: '2px solid #FFCC00',
          backgroundColor: '#FFF9E6',
          boxShadow: selected ? '0 4px 12px rgba(0, 0, 0, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.08)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}
      >
        {/* EROAD Generous Padding */}
        <div className="px-6 py-5">
          <div className="flex items-start gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <h3 className="text-gray-900 font-bold text-base leading-tight flex-1">
              {data.title || 'Decision'}
            </h3>
          </div>
          
          {/* Description if exists */}
          {data.description && (
            <p className="text-gray-700 text-sm leading-relaxed mb-3">
              {data.description}
            </p>
          )}

          {/* Yes/No indicators */}
          <div className="flex items-center justify-between pt-2 border-t border-yellow-200">
            <span className="text-green-600 font-semibold text-sm">✓ Yes</span>
            <span className="text-red-600 font-semibold text-sm">✗ No</span>
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
