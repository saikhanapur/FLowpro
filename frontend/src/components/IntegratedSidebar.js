import React, { useState } from 'react';
import { X, ChevronRight, CheckCircle, XCircle, AlertTriangle, FileText, Zap, Target, Database, GitBranch } from 'lucide-react';

const IntegratedSidebar = ({ 
  selectedNode, 
  process, 
  intelligence, 
  intelligenceLoading, 
  showIntelligence, 
  onClose, 
  onUpdateNode, 
  onRefreshIntelligence, 
  onRegenerateIntelligence, 
  readOnly, 
  accessLevel, 
  isSimpleProcess 
}) => {
  // Determine default tab based on what's being shown
  const getDefaultTab = () => {
    if (showIntelligence && !selectedNode) return 'insights';
    if (selectedNode) return 'details';
    return 'gaps';
  };
  
  const [activeTab, setActiveTab] = useState(getDefaultTab());

  // Analyze gaps from process nodes
  const criticalGaps = process?.nodes?.filter(n => 
    n.status === 'warning' || 
    n.gap || 
    n.hasGap ||
    n.title?.toLowerCase().includes('critical')
  ) || [];

  const processGaps = intelligence?.issues?.filter(i => 
    i.severity === 'medium' || i.issue_type === 'serial_bottleneck'
  ) || [];

  const worksWell = process?.nodes?.filter(n => 
    n.status === 'complete' || 
    n.status === 'active'
  ).slice(0, 3) || [];

  // Use selectedNode directly (it's already the full node object)
  const nodeData = selectedNode;
  
  // Determine what to show based on context
  const showingNodeDetails = selectedNode && !showIntelligence;
  const showingIntelligence = showIntelligence && !selectedNode;

  return (
    <div 
      className="fixed right-8 overflow-y-auto z-50 shadow-lg rounded-lg"
      style={{
        width: '360px', // Reduced from 480px (30% of typical viewport)
        backgroundColor: '#FFFFFF',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        top: '132px', // Align with flowchart container (after legend)
        height: 'calc(100vh - 132px - 32px)', // Match flowchart height exactly (minus top + bottom padding)
        border: '1px solid #D1D5DB' // Match flowchart border
      }}
    >
      {/* Header - Simple, No Tabs */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-gray-900 font-bold text-lg">
            {showingNodeDetails ? 'Step Details' : showingIntelligence ? 'AI Quick Tips' : 'Process Analysis'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content - Single Scrollable View (No Tabs) */}
      <div className="px-6 py-6 space-y-6">
        
        {/* When showing Node Details (clicked a node) */}
        {showingNodeDetails && nodeData && (
          <>
            {/* Node Title & Description */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <GitBranch className="w-5 h-5 text-blue-600" />
                <h3 className="text-gray-900 font-bold text-xl">
                  {nodeData.title || 'Process Step'}
                </h3>
              </div>
              {nodeData.description && (
                <p className="text-gray-600 text-sm leading-relaxed">
                  {nodeData.description}
                </p>
              )}
            </div>
          <div className="space-y-6">
            {/* AI Insights Header */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-blue-600" />
                <h3 className="text-blue-900 font-bold text-lg">AI Process Intelligence</h3>
              </div>
              <p className="text-blue-700 text-sm">
                {isSimpleProcess 
                  ? 'Quick improvements to enhance your process'
                  : 'AI-generated insights to optimize your workflow'}
              </p>
            </div>

            {/* Intelligence Issues */}
            {intelligenceLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 text-sm mt-4">Analyzing process...</p>
              </div>
            ) : intelligence?.issues && intelligence.issues.length > 0 ? (
              <div className="space-y-4">
                {intelligence.issues.slice(0, isSimpleProcess ? 2 : 5).map((issue, idx) => (
                  <div key={idx} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        issue.severity === 'high' ? 'bg-red-100' : 'bg-yellow-100'
                      }`}>
                        <AlertTriangle className={`w-4 h-4 ${
                          issue.severity === 'high' ? 'text-red-600' : 'text-yellow-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">
                          {issue.title || issue.description}
                        </h4>
                        <p className="text-gray-600 text-xs leading-relaxed">
                          {issue.description || issue.recommendation}
                        </p>
                        {issue.cost_impact_monthly && (
                          <div className="mt-2 text-xs text-gray-500">
                            <span className="font-medium">Impact:</span> ~${issue.cost_impact_monthly}/month
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-700 font-medium">No issues found</p>
                <p className="text-gray-500 text-sm mt-1">Your process looks good!</p>
              </div>
            )}

            {/* Regenerate Button */}
            {onRegenerateIntelligence && !readOnly && (
              <button
                onClick={onRegenerateIntelligence}
                disabled={intelligenceLoading}
                className="w-full px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors border border-blue-200"
              >
                {intelligenceLoading ? 'Analyzing...' : 'Regenerate Insights'}
              </button>
            )}
          </div>
        )}

        {/* When showing Node Details (clicked a node) - Details Tab */}
        {showingNodeDetails && activeTab === 'details' && nodeData && (
          <div className="space-y-6">
            {/* Selected Node Title */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <GitBranch className="w-5 h-5 text-blue-600" />
                <h3 className="text-gray-900 font-bold text-xl">
                  {nodeData.title || 'Process Step'}
                </h3>
              </div>
              {nodeData.description && (
                <p className="text-gray-600 text-sm">
                  {nodeData.description}
                </p>
              )}
            </div>

            {/* Process Steps List */}
            {process?.nodes && process.nodes.length > 0 && (
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <h4 className="text-gray-900 font-semibold text-sm mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  Process Steps
                </h4>
                <div className="space-y-2">
                  {process.nodes.map((node, index) => (
                    <div 
                      key={node.id}
                      className={`flex items-center gap-2 text-sm px-2 py-1 rounded ${
                        node.id === nodeData.id ? 'bg-blue-100 text-blue-900 font-semibold' : 'text-gray-600'
                      }`}
                    >
                      <ChevronRight className="w-4 h-4 flex-shrink-0" />
                      <span>Step {index + 1}: {node.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Operational Details */}
            {nodeData.operationalDetails && (
              <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
                <div className="flex items-start gap-3 pb-3 border-b border-gray-200">
                  <Database className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-gray-900 font-semibold text-base mb-1">
                      Operational Details
                    </h4>
                    <p className="text-gray-600 text-sm">
                      Required information and actions for this step
                    </p>
                  </div>
                </div>

                {nodeData.operationalDetails.requiredData && nodeData.operationalDetails.requiredData.length > 0 && (
                  <div className="bg-green-50 rounded-lg border border-green-200 p-4">
                    <h5 className="text-green-900 font-semibold text-sm mb-2">Required Data:</h5>
                    <div className="space-y-1.5">
                      {nodeData.operationalDetails.requiredData.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-green-800">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {nodeData.operationalDetails.specificActions && nodeData.operationalDetails.specificActions.length > 0 && (
                  <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                    <h5 className="text-blue-900 font-semibold text-sm mb-2">Actions:</h5>
                    <div className="space-y-1.5">
                      {nodeData.operationalDetails.specificActions.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-blue-800">
                          <Target className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Current & Ideal State */}
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <h4 className="text-gray-900 font-semibold text-sm">Current State</h4>
                </div>
                <p className="text-gray-700 text-sm">
                  {nodeData.currentState || 'Manual process with standard procedures'}
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-blue-600" />
                  </div>
                  <h4 className="text-blue-900 font-semibold text-sm">Ideal State</h4>
                </div>
                <p className="text-blue-800 text-sm">
                  {nodeData.idealState || 'Automated process with real-time monitoring'}
                </p>
              </div>
            </div>

            {/* Identified Gap */}
            {(nodeData.gap || nodeData.status === 'warning') && (
              <div className="bg-yellow-50 rounded-lg border-l-4 border-yellow-500 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 text-sm mb-1">Identified Gap</h4>
                    <p className="text-yellow-800 text-sm">
                      {nodeData.gap || 'Process optimization opportunity identified'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* When showing Node Details (clicked a node) - Context Tab */}
        {showingNodeDetails && activeTab === 'gaps' && (
          <div className="space-y-6">
            {/* Critical Gaps */}
            <div className="bg-red-50 rounded-lg border border-red-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-red-900 font-bold text-base">
                  Critical Gaps ({criticalGaps.length})
                </h3>
              </div>
              
              <div className="space-y-3">
                {criticalGaps.slice(0, 3).map((node, i) => (
                  <div key={i} className="bg-red-100 rounded-lg p-3">
                    <p className="text-red-900 font-semibold text-sm mb-1">
                      {node.title}:
                    </p>
                    <p className="text-red-800 text-xs">
                      {node.gap || 'Missing error handling or backup procedure'}
                    </p>
                  </div>
                ))}
                {criticalGaps.length === 0 && (
                  <p className="text-red-700 text-sm italic">No critical gaps identified</p>
                )}
              </div>
            </div>

            {/* Process Gaps */}
            <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                </div>
                <h3 className="text-yellow-900 font-bold text-base">
                  Process Gaps ({processGaps.length})
                </h3>
              </div>
              
              <div className="space-y-2">
                {processGaps.slice(0, 5).map((gap, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-yellow-900">
                    <span className="text-yellow-600">•</span>
                    <span>{gap.description || gap.title}</span>
                  </div>
                ))}
                {processGaps.length === 0 && (
                  <p className="text-yellow-700 text-sm italic">No process gaps identified</p>
                )}
              </div>
            </div>

            {/* Works Well */}
            <div className="bg-green-50 rounded-lg border border-green-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-green-900 font-bold text-base">
                  Works Well ({worksWell.length})
                </h3>
              </div>
              
              <div className="space-y-2">
                {worksWell.length > 0 ? (
                  worksWell.map((node, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-green-900">
                      <span className="text-green-600">•</span>
                      <span>{node.title}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-green-700 text-sm italic">No completed or active steps identified yet</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegratedSidebar;
