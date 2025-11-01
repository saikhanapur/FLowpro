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
        <Handle type="target" position={Position.Top} className="!bg-green-500 !w-2 !h-2" />
      )}
      
      {/* Minimalist Pill Design */}
      <div 
        className={`
          px-8 py-4 rounded-full
          bg-gradient-to-r from-emerald-500 to-green-500
          shadow-lg hover:shadow-xl
          transition-all duration-300
          ${selected ? 'ring-2 ring-green-400 ring-offset-2 scale-105' : ''}
          min-w-[220px]
        `}
      >
        <div className="flex items-center justify-center gap-2.5">
          {isStart ? (
            <Play className="w-4 h-4 text-white fill-white" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-white" />
          )}
          <h3 className="text-white font-semibold text-base">
            {data.title || (isStart ? 'Start' : 'Complete')}
          </h3>
        </div>
      </div>

      {/* Only show source handle if not end */}
      {!isEnd && (
        <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-2 !h-2" />
      )}
    </>
  );
};

export default StartEndNode;
