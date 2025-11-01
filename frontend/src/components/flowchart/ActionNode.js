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

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-2 !h-2 !border-none" />
      
      {/* Consistent Card Design with Subtle Border */}
      <div 
        className={`
          group relative
          bg-white rounded-xl 
          border-2 transition-all duration-300
          ${isCritical ? 'border-red-400' : 'border-slate-200'}
          ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'hover:border-slate-300'}
          shadow-sm hover:shadow-lg
          min-w-[280px] max-w-[320px]
        `}
        onMouseEnter={() => hasDetails && setShowDetails(true)}
        onMouseLeave={() => setShowDetails(false)}
      >
        {/* Main Content */}
        <div className="px-5 py-4">
          {/* Title */}
          <h3 className="text-slate-900 font-semibold text-[15px] leading-snug mb-1.5">
            {data.title}
          </h3>
          
          {/* Actor - subtle */}
          {data.actor && (
            <p className="text-slate-500 text-xs font-medium mb-2">
              {data.actor}
            </p>
          )}

          {/* Description - only if not too long */}
          {data.description && data.description.length < 100 && (
            <p className="text-slate-600 text-[13px] leading-relaxed">
              {data.description}
            </p>
          )}
        </div>

        {/* Detail indicator - MORE VISIBLE */}
        {hasDetails && (
          <div className="absolute -top-2 -right-2 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform border-2 border-white">
            <Info className="w-4 h-4 text-white" />
          </div>
        )}

        {/* Expandable details on hover */}
        {hasDetails && showDetails && (
          <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-xl shadow-2xl border-2 border-slate-200 p-4 z-50 max-w-[380px]">
            <div className="space-y-3 text-sm">
              {/* Required Data */}
              {data.operationalDetails?.requiredData?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1.5 text-xs">Required Data:</h4>
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
                  <h4 className="font-semibold text-slate-900 mb-1.5 text-xs">Contacts:</h4>
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
                  <h4 className="font-semibold text-slate-900 mb-1.5 text-xs">Actions:</h4>
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
