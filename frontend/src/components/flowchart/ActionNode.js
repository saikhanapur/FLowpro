import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Info } from 'lucide-react';

const ActionNode = ({ data, selected }) => {
  const [showDetails, setShowDetails] = useState(false);

  // Check if node has operational details
  const hasDetails = data.operationalDetails && (
    data.operationalDetails.requiredData?.length > 0 ||
    data.operationalDetails.specificActions?.length > 0 ||
    Object.keys(data.operationalDetails.contactInfo || {}).length > 0
  );

  const isCritical = data.status === 'warning' || data.title?.toLowerCase().includes('critical');

  // Status-based coloring (EROAD design)
  const getStatusColor = () => {
    if (isCritical) return 'border-red-400';
    if (data.status === 'active') return 'border-blue-400';
    if (data.status === 'complete') return 'border-green-400';
    return 'border-slate-300';
  };

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-2 !h-2 !border-none" />
      
      {/* EROAD Design: Clean white card with colored border, 240px width */}
      <div 
        className={`
          group relative
          bg-white rounded-lg
          border-2 transition-all duration-200
          ${getStatusColor()}
          ${selected ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
          shadow-sm hover:shadow-md
          w-60
        `}
        style={{
          width: '240px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}
        onMouseEnter={() => hasDetails && setShowDetails(true)}
        onMouseLeave={() => setShowDetails(false)}
      >
        {/* Generous padding */}
        <div className="px-4 py-4">
          {/* Title */}
          <h3 className="text-slate-900 font-medium text-sm leading-tight mb-2">
            {data.title}
          </h3>
          
          {/* Actor - subtle */}
          {data.actor && (
            <p className="text-slate-500 text-xs mb-2">
              {data.actor}
            </p>
          )}

          {/* Description */}
          {data.description && data.description.length < 120 && (
            <p className="text-slate-600 text-xs leading-relaxed">
              {data.description}
            </p>
          )}
        </div>

        {/* Detail indicator */}
        {hasDetails && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform border-2 border-white">
            <Info className="w-3.5 h-3.5 text-white" />
          </div>
        )}

        {/* Expandable details on hover */}
        {hasDetails && showDetails && (
          <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-lg shadow-lg border border-slate-200 p-4 z-50 w-80">
            <div className="space-y-3 text-sm">
              {/* Required Data */}
              {data.operationalDetails?.requiredData?.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-900 mb-1.5 text-xs">Required Data:</h4>
                  <ul className="space-y-0.5 ml-4">
                    {data.operationalDetails.requiredData.map((item, i) => (
                      <li key={i} className="text-slate-700 text-xs">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Contact Info */}
              {Object.keys(data.operationalDetails?.contactInfo || {}).length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-900 mb-1.5 text-xs">Contacts:</h4>
                  <div className="space-y-0.5 ml-4">
                    {Object.entries(data.operationalDetails.contactInfo).map(([name, number]) => (
                      <div key={name} className="text-xs text-slate-700">
                        <span className="font-medium">{name}:</span> {number}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Specific Actions */}
              {data.operationalDetails?.specificActions?.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-900 mb-1.5 text-xs">Actions:</h4>
                  <ul className="space-y-0.5 ml-4">
                    {data.operationalDetails.specificActions.map((item, i) => (
                      <li key={i} className="text-slate-700 text-xs">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Timeline */}
              {data.operationalDetails?.timeline && (
                <div className="text-xs text-slate-700 pt-1 border-t border-slate-200">
                  <span className="font-medium">Timeline:</span> {data.operationalDetails.timeline}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-2 !h-2 !border-none" />
    </>
  );
};

export default ActionNode;
