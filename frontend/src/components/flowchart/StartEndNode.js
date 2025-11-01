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
        <Handle type="target" position={Position.Top} className="!bg-green-500" />
      )}
      
      {/* Pill-shaped container with gradient */}
      <div 
        className={`
          px-8 py-4 rounded-full
          ${selected ? 'ring-4 ring-green-400 ring-offset-2' : ''}
          transition-all duration-200 hover:scale-105
          min-w-[200px]
        `}
        style={{
          background: isStart 
            ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
            : 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
          boxShadow: selected 
            ? '0 10px 30px rgba(16, 185, 129, 0.4)' 
            : '0 6px 20px rgba(16, 185, 129, 0.3)',
        }}
      >
        <div className="flex items-center justify-center gap-2">
          {isStart ? (
            <Play className="w-5 h-5 text-white fill-white" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-white" />
          )}
          <h3 className="text-white font-bold text-base">
            {data.title || (isStart ? 'Start' : 'Complete')}
          </h3>
        </div>
        
        {data.description && (
          <p className="text-white/80 text-xs mt-1 text-center">
            {data.description}
          </p>
        )}
      </div>

      {/* Only show source handle if not end */}
      {!isEnd && (
        <Handle type="source" position={Position.Bottom} className="!bg-green-500" />
      )}
    </>
  );
};

export default StartEndNode;
