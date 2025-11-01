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
      
      {/* Consistent Design with Border */}
      <div 
        className={`
          px-7 py-3.5 rounded-full
          bg-gradient-to-r from-emerald-500 to-green-500
          border-2 border-emerald-600
          shadow-lg hover:shadow-xl
          transition-all duration-300
          ${selected ? 'ring-2 ring-green-400 ring-offset-2 scale-105' : ''}
          min-w-[240px]
        `}
      >
        <div className="flex items-center justify-center gap-2">
          {isStart ? (
            <Play className="w-4 h-4 text-white fill-white" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-white" />
          )}
          <h3 className="text-white font-semibold text-[15px]">
            {data.title || (isStart ? 'Start' : 'Complete')}
          </h3>
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
