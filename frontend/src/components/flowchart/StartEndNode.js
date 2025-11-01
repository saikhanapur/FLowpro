import React from 'react';
import { Handle, Position } from 'reactflow';
import { Play, CheckCircle } from 'lucide-react';

const StartEndNode = ({ data, selected }) => {
  const isStart = data.type === 'trigger' || data.status === 'trigger';
  const isEnd = data.type === 'end' || data.title?.toLowerCase().includes('end') || data.title?.toLowerCase().includes('complete');

  return (
    <>
      {/* Only show target handle if not start */}
      {!isStart && (
        <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2.5 !h-2.5 !border-none" />
      )}
      
      {/* EROAD Design: Green start/end nodes */}
      <div 
        className="rounded-xl transition-shadow duration-200"
        style={{
          width: '280px',
          border: '2px solid #34C759',
          backgroundColor: '#E8F8ED',
          boxShadow: selected ? '0 4px 12px rgba(0, 0, 0, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.08)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}
      >
        {/* EROAD Generous Padding */}
        <div className="px-6 py-5">
          <div className="flex items-center gap-3">
            {isStart ? (
              <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                <Play className="w-5 h-5 text-white fill-white" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            )}
            <h3 className="text-gray-900 font-bold text-base leading-tight">
              {data.title || (isStart ? 'Start' : 'Complete')}
            </h3>
          </div>
          
          {/* Description if exists */}
          {data.description && (
            <p className="text-gray-700 text-sm leading-relaxed mt-3">
              {data.description}
            </p>
          )}
        </div>
      </div>

      {/* Only show source handle if not end */}
      {!isEnd && (
        <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-2.5 !h-2.5 !border-none" />
      )}
    </>
  );
};

export default StartEndNode;
