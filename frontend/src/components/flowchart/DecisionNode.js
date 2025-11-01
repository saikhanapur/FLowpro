import React from 'react';
import { Handle, Position } from 'reactflow';
import { AlertTriangle, Info } from 'lucide-react';

const DecisionNode = ({ data, selected }) => {
  const hasDetails = data.operationalDetails && (
    data.operationalDetails.requiredData?.length > 0 ||
    data.operationalDetails.specificActions?.length > 0 ||
    Object.keys(data.operationalDetails.contactInfo || {}).length > 0
  );

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-orange-500" />
      
      {/* Diamond Shape - Decision Node */}
      <div 
        className={`
          relative w-48 h-48 transform rotate-45
          ${selected ? 'ring-4 ring-orange-400 ring-offset-2' : ''}
          transition-all duration-200
        `}
        style={{
          background: 'linear-gradient(135deg, #FFA500 0%, #FF8C00 100%)',
          boxShadow: selected 
            ? '0 20px 40px rgba(255, 165, 0, 0.4), 0 0 0 3px rgba(255, 165, 0, 0.2)' 
            : '0 10px 30px rgba(255, 140, 0, 0.3)',
        }}
      >
        {/* Content Container (rotated back) */}
        <div className="absolute inset-0 flex items-center justify-center transform -rotate-45 p-6">
          <div className="text-center">
            {/* Decision Icon */}
            <div className="mb-2 flex justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            
            {/* Decision Question */}
            <h3 className="text-white font-bold text-sm leading-tight mb-1">
              {data.title || 'Decision Point'}
            </h3>
            
            {/* Badge for operational details */}
            {hasDetails && (
              <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-white/20 rounded-full">
                <Info className="w-3 h-3 text-white" />
                <span className="text-xs text-white font-medium">Details</span>
              </div>
            )}
          </div>
        </div>

        {/* Pulse effect for decision tension */}
        {selected && (
          <div 
            className="absolute inset-0 animate-ping opacity-20"
            style={{
              background: 'linear-gradient(135deg, #FFA500 0%, #FF8C00 100%)',
            }}
          />
        )}
      </div>

      {/* YES Branch - Right */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="yes"
        className="!bg-green-500 !w-4 !h-4"
        style={{ top: '50%', right: '-8px' }}
      />

      {/* NO Branch - Bottom */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="no"
        className="!bg-red-500 !w-4 !h-4"
        style={{ left: '50%', bottom: '-8px' }}
      />
    </>
  );
};

export default DecisionNode;
