import React from 'react';
import { Handle, Position } from 'reactflow';
import { Play, CheckCircle2 } from 'lucide-react';

const StartEndNode = ({ data, selected }) => {
  const isStart = data.type === 'trigger' || data.status === 'trigger';
  const isEnd = data.type === 'end' || data.title?.toLowerCase().includes('end') || data.title?.toLowerCase().includes('complete');

  return (
    <>
      {/* Only show target handle if not start */}
      {!isStart && (
        <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-2 !h-2 !border-none" />
      )}
      
      {/* EROAD Design: Clean white card with green border for start/end */}
      <div 
        className={`
          bg-white rounded-lg
          border-2 border-green-400
          shadow-sm hover:shadow-md
          transition-all duration-200
          ${selected ? 'ring-2 ring-green-300 ring-offset-2' : ''}
          w-60
        `}
        style={{
          width: '240px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}
      >
        {/* Generous padding */}
        <div className="px-4 py-4">
          <div className="flex items-center justify-center gap-2">
            {isStart ? (
              <Play className="w-4 h-4 text-green-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            )}
            <h3 className="text-slate-900 font-medium text-sm">
              {data.title || (isStart ? 'Start' : 'Complete')}
            </h3>
          </div>
          
          {/* Description if exists */}
          {data.description && (
            <p className="text-slate-600 text-xs leading-relaxed mt-2 text-center">
              {data.description}
            </p>
          )}
        </div>
      </div>

      {/* Only show source handle if not end */}
      {!isEnd && (
        <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-2 !h-2 !border-none" />
      )}
    </>
  );
};

export default StartEndNode;
