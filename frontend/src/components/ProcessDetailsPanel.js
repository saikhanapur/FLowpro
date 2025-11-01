import React from 'react';
import { X, ChevronRight, CheckCircle, XCircle, AlertTriangle, FileText, Zap, Target } from 'lucide-react';

const ProcessDetailsPanel = ({ process, selectedNode, onClose }) => {
  if (!selectedNode) return null;

  // Find the node data
  const nodeData = process?.nodes?.find(n => n.id === selectedNode.id) || selectedNode.data;

  return (
    <div 
      className="fixed top-0 right-0 h-full overflow-y-auto z-50 shadow-2xl"
      style={{
        width: '420px',
        backgroundColor: '#2E3339',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}
    >
      {/* Header */}
      <div className="sticky top-0 bg-[#2E3339] z-10 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-white font-bold text-lg">Process Details</h2>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-6">
        
        {/* Selected Process Title */}
        <div>
          <h3 className="text-white font-bold text-xl mb-1">
            {nodeData?.title || 'Process Step'}
          </h3>
          {nodeData?.description && (
            <p className="text-gray-400 text-sm">
              {nodeData.description}
            </p>
          )}
        </div>

        {/* Process Steps List */}
        {process?.nodes && process.nodes.length > 0 && (
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Process Steps</h4>
            <div className="space-y-2">
              {process.nodes.map((node, index) => (
                <div 
                  key={node.id}
                  className={`flex items-center gap-2 text-sm ${
                    node.id === selectedNode.id ? 'text-white font-semibold' : 'text-gray-400'
                  }`}
                >
                  <ChevronRight className="w-4 h-4 flex-shrink-0" />
                  <span>Step {index + 1}: {node.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Information Block */}
        {nodeData?.operationalDetails && (
          <div className="bg-[#3A4149] rounded-lg p-5 space-y-4">
            
            {/* Header with Icon */}
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-white font-semibold text-base mb-1">
                  Operational Details
                </h4>
                <p className="text-gray-400 text-sm">
                  Required information and actions for this step
                </p>
              </div>
            </div>

            {/* Required Data */}
            {nodeData.operationalDetails.requiredData && nodeData.operationalDetails.requiredData.length > 0 && (
              <div>
                <h5 className="text-white font-semibold text-sm mb-2">Required Data:</h5>
                <div className="space-y-1.5">
                  {nodeData.operationalDetails.requiredData.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Specific Actions */}
            {nodeData.operationalDetails.specificActions && nodeData.operationalDetails.specificActions.length > 0 && (
              <div>
                <h5 className="text-white font-semibold text-sm mb-2">Actions:</h5>
                <div className="space-y-1.5">
                  {nodeData.operationalDetails.specificActions.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <Target className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Info */}
            {nodeData.operationalDetails.contactInfo && Object.keys(nodeData.operationalDetails.contactInfo).length > 0 && (
              <div>
                <h5 className="text-white font-semibold text-sm mb-2">Contacts:</h5>
                <div className="space-y-1.5">
                  {Object.entries(nodeData.operationalDetails.contactInfo).map(([name, number]) => (
                    <div key={name} className="text-sm text-gray-300">
                      <span className="font-medium text-white">{name}:</span> {number}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            {nodeData.operationalDetails.timeline && (
              <div className="pt-3 border-t border-gray-600">
                <div className="text-sm text-gray-300">
                  <span className="font-medium text-white">Timeline:</span> {nodeData.operationalDetails.timeline}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Potential Failures Section (Mock data for demo) */}
        {(nodeData?.status === 'warning' || nodeData?.title?.toLowerCase().includes('critical')) && (
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Potential Failures</h4>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm text-gray-300">
                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>Missing required data → Contact responsible party</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-300">
                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>Timeout exceeded → Review process timing</span>
              </div>
            </div>
          </div>
        )}

        {/* Dependencies */}
        {nodeData?.actor && (
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Dependencies</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <span>•</span>
                <span>Actor: {nodeData.actor}</span>
              </div>
              {nodeData.operationalDetails?.systems && (
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span>•</span>
                  <span>Systems: {nodeData.operationalDetails.systems.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Current State */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-blue-400" />
            <h4 className="text-white font-semibold text-sm">Current State</h4>
          </div>
          <p className="text-gray-400 text-sm">
            {nodeData?.currentState || 'Manual process with standard procedures'}
          </p>
        </div>

        {/* Ideal State */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <h4 className="text-white font-semibold text-sm">Ideal State</h4>
          </div>
          <p className="text-gray-400 text-sm">
            {nodeData?.idealState || 'Automated process with real-time monitoring and alerts'}
          </p>
        </div>

        {/* Identified Gap */}
        {(nodeData?.gap || nodeData?.status === 'warning') && (
          <div 
            className="rounded-lg p-4"
            style={{
              backgroundColor: '#FFF9E6',
              border: '1px solid #FFCC00'
            }}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1">Identified Gap</h4>
                <p className="text-gray-700 text-sm">
                  {nodeData?.gap || 'Process optimization opportunity identified'}
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ProcessDetailsPanel;
