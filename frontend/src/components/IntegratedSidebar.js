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
    <div className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-2xl z-50 border-l overflow-y-auto">
      {/* Dark gradient header - EROAD STYLE */}
      <div className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-700 text-white p-6 flex justify-between items-center z-10">
        <h2 className="font-bold text-lg">
          {showingNodeDetails ? 'Step Details' : showingIntelligence ? 'AI Quick Tips' : 'Process Analysis'}
        </h2>
        <button 
          onClick={onClose}
          className="text-white text-2xl hover:bg-white/10 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
        >
          ×
        </button>
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
          </>
        )}

        {/* When showing AI Intelligence (clicked AI badge) */}
        {showingIntelligence && (
          <div className="space-y-4">
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
      </div>
    </div>
  );
};

export default IntegratedSidebar;
