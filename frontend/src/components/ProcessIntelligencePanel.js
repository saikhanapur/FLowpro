import React, { useState } from 'react';
import { Sparkles, AlertTriangle, CheckCircle, TrendingUp, DollarSign, Clock, Activity, RefreshCw, ChevronDown, ChevronRight, AlertCircle, Zap, Users, Timer, FileText, Target, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ProcessIntelligencePanel = ({ intelligence, loading, onRefresh, onRegenerate, onClose, isSimpleProcess = false }) => {
  const [expandedIssues, setExpandedIssues] = useState({});
  const [expandedScores, setExpandedScores] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    // Load saved preference from localStorage, default to 'summary'
    return localStorage.getItem('intelligence_view_mode') || 'summary';
  });

  const toggleIssue = (idx) => {
    setExpandedIssues(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setRegenerating(false);
    }
  };

  const toggleViewMode = () => {
    const newMode = viewMode === 'summary' ? 'detailed' : 'summary';
    setViewMode(newMode);
    localStorage.setItem('intelligence_view_mode', newMode);
  };
  if (loading) {
    return (
      <div className="w-96 border-l border-slate-200 bg-slate-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-slate-600">Analyzing process...</p>
        </div>
      </div>
    );
  }

  if (!intelligence) {
    return null;
  }

  const getHealthColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getHealthBgColor = (score) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getIssueTypeIcon = (issueType) => {
    switch (issueType) {
      case 'missing_error_handling': return <AlertCircle className="w-4 h-4" />;
      case 'serial_bottleneck': return <Zap className="w-4 h-4" />;
      case 'unclear_ownership': return <Users className="w-4 h-4" />;
      case 'missing_timeout': return <Timer className="w-4 h-4" />;
      case 'missing_handoff': return <FileText className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getIssueTypeLabel = (issueType) => {
    switch (issueType) {
      case 'missing_error_handling': return 'Missing Error Handling';
      case 'serial_bottleneck': return 'Serial Bottleneck';
      case 'unclear_ownership': return 'Unclear Ownership';
      case 'missing_timeout': return 'Missing Timeout';
      case 'missing_handoff': return 'Missing Handoff';
      default: return 'Process Issue';
    }
  };

  return (
    <div className="w-96 border-l border-slate-200 bg-slate-50 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
      <div className="p-6">
        {/* AI Disclaimer - Different for simple vs complex */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700">
            {isSimpleProcess ? (
              <>
                <span className="font-semibold">Quick Tips:</span> AI-identified patterns that could improve your process. These are suggestions based on common practices.
              </>
            ) : (
              <>
                <span className="font-semibold">AI-Generated Analysis:</span> This analysis identifies common patterns in process documentation. It does not assess operational risk or system reliability. Consult domain experts before implementing changes.
              </>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900">
              {isSimpleProcess ? 'Quick Tips' : 'Process Intelligence'}
            </h2>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRegenerate}
                disabled={regenerating}
                title="Regenerate fresh analysis"
              >
                <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
                title="Close intelligence panel"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* View Mode Toggle - Segmented Control Style - Only for complex processes */}
          {!isSimpleProcess && (
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => viewMode !== 'summary' && toggleViewMode()}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-semibold transition-all ${
                  viewMode === 'summary'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Summary
              </button>
              <button
                onClick={() => viewMode !== 'detailed' && toggleViewMode()}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-semibold transition-all ${
                  viewMode === 'detailed'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Detailed
              </button>
            </div>
          )}
        </div>

        {/* Health Score - Only for complex processes */}
        {!isSimpleProcess && (
        <div className={`rounded-xl p-6 border-2 mb-6 ${getHealthBgColor(intelligence.health_score)}`}>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Activity className={`w-5 h-5 ${getHealthColor(intelligence.health_score)}`} />
            </div>
            <div className={`text-5xl font-bold ${getHealthColor(intelligence.health_score)} mb-2`}>
              {intelligence.health_score}
            </div>
            <p className="text-sm font-semibold text-slate-700">Health Score</p>
            
            {viewMode === 'summary' && intelligence.overall_explanation && (
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                {intelligence.overall_explanation}
              </p>
            )}
          </div>

          {/* Score Breakdown - Only show in detailed view or if expanded in summary */}
          {viewMode === 'detailed' && intelligence.score_breakdown && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <button
                onClick={() => setExpandedScores(!expandedScores)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 mb-2 hover:text-slate-900"
              >
                <span>Score Breakdown</span>
                {expandedScores ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              
              {expandedScores && intelligence.overall_explanation && (
                <div className="mb-3 p-2 bg-white/50 rounded-lg">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {intelligence.overall_explanation}
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                {Object.entries(intelligence.score_breakdown)
                  .filter(([key]) => !key.includes('_explanation'))
                  .map(([key, value]) => {
                    const explanationKey = `${key}_explanation`;
                    const explanation = intelligence.score_breakdown[explanationKey];
                    
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 capitalize">{key.replace('_', ' ')}</span>
                          <span className="font-semibold text-slate-800">{value}/100</span>
                        </div>
                        {expandedScores && explanation && (
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
              </div>
              
              {expandedScores && (intelligence.top_strength || intelligence.top_weakness) && (
                <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                  {intelligence.top_strength && (
                    <div className="flex gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-green-700">Top Strength</div>
                        <p className="text-xs text-slate-600">{intelligence.top_strength}</p>
                      </div>
                    </div>
                  )}
                  {intelligence.top_weakness && (
                    <div className="flex gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-amber-700">Top Weakness</div>
                        <p className="text-xs text-slate-600">{intelligence.top_weakness}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Benchmarks - Only in detailed view */}
        {viewMode === 'detailed' && intelligence.benchmarks && (
          <div className="bg-white rounded-xl p-4 border border-slate-200 mb-6">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Industry Benchmark
            </h3>
            <div className="space-y-3">
              {/* Duration Comparison */}
              {intelligence.benchmarks.expected_duration_minutes !== undefined ? (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">Expected Duration</span>
                    <span className="font-semibold text-emerald-600">
                      {intelligence.benchmarks.expected_duration_minutes} min
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Current Duration</span>
                    <span className="font-semibold text-slate-800">
                      {intelligence.benchmarks.current_estimated_duration_minutes} min
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">Expected Duration</span>
                    <span className="font-semibold text-emerald-600">
                      {intelligence.benchmarks.expected_duration_days} days
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Current Duration</span>
                    <span className="font-semibold text-slate-800">
                      {intelligence.benchmarks.current_estimated_duration_days} days
                    </span>
                  </div>
                </div>
              )}
              
              {/* Success Rates */}
              {intelligence.benchmarks.success_rate_current !== undefined && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">Current Success Rate</span>
                    <span className="font-semibold text-slate-800">
                      {intelligence.benchmarks.success_rate_current}%
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Potential Success Rate</span>
                    <span className="font-semibold text-emerald-600">
                      {intelligence.benchmarks.success_rate_potential}%
                    </span>
                  </div>
                </div>
              )}
              
              {/* Industry Comparison Badge */}
              <div className={`px-3 py-2 rounded-lg text-xs font-semibold text-center ${
                intelligence.benchmarks.industry_comparison === 'faster' ? 'bg-green-50 text-green-700' :
                intelligence.benchmarks.industry_comparison === 'slower' ? 'bg-red-50 text-red-700' :
                'bg-blue-50 text-blue-700'
              }`}>
                {typeof intelligence.benchmarks.industry_comparison === 'string' && intelligence.benchmarks.industry_comparison.includes('%') 
                  ? intelligence.benchmarks.industry_comparison
                  : intelligence.benchmarks.industry_comparison === 'faster' ? '✓ Faster than average' :
                    intelligence.benchmarks.industry_comparison === 'slower' ? '⚠ Slower than average' :
                    '= Average speed'}
              </div>
              
              {/* Monthly Incidents */}
              {intelligence.benchmarks.estimated_monthly_incidents !== undefined && (
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Est. Monthly Incidents</span>
                    <span className="font-semibold text-slate-800">
                      {intelligence.benchmarks.estimated_monthly_incidents}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ROI Summary Banner - Only for complex processes */}
        {!isSimpleProcess && intelligence.total_savings_potential > 0 && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-green-700 mb-1">
                  ~${intelligence.total_savings_potential.toLocaleString()}<span className="text-sm font-normal">/month</span>
                </div>
                <p className="text-xs text-slate-700 font-medium mb-2">
                  {intelligence.roi_summary || 'Estimated opportunity based on detected issues'}
                </p>
                {viewMode === 'summary' && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Info className="w-3.5 h-3.5" />
                    <span>Based on industry patterns • Estimates may vary</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        )}

        {/* Issues */}
        {intelligence.issues && intelligence.issues.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              {isSimpleProcess 
                ? 'Quick Tips' 
                : viewMode === 'summary' 
                  ? `Top Issues (${Math.min(3, intelligence.issues.length)})` 
                  : `Issues Detected (${intelligence.issues.length})`
              }
            </h3>
            <div className="space-y-3">
              {intelligence.issues
                .slice(0, isSimpleProcess ? 2 : (viewMode === 'summary' ? 3 : intelligence.issues.length))
                .map((issue, idx) => (
                <div key={idx} className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
                  {/* Issue Header - Always Visible */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => !isSimpleProcess && viewMode === 'detailed' && toggleIssue(idx)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Issue Type Icon */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${getSeverityColor(issue.severity)}`}>
                        {getIssueTypeIcon(issue.issue_type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {/* Node Badge */}
                        {issue.node_id && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-xs font-semibold mb-2">
                            <Target className="w-3 h-3" />
                            Step {issue.node_id}: {issue.node_title}
                          </div>
                        )}
                        
                        {/* Issue Type Label */}
                        {issue.issue_type && viewMode === 'detailed' && (
                          <div className="text-xs font-semibold text-slate-500 mb-1">
                            {getIssueTypeLabel(issue.issue_type)}
                          </div>
                        )}
                        
                        {/* Title */}
                        <h4 className="font-semibold text-sm text-slate-900 mb-1">
                          {issue.title}
                        </h4>
                        
                        {/* Quick Stats */}
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          {/* Severity */}
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${getSeverityColor(issue.severity)}`}>
                            {getSeverityIcon(issue.severity)}
                            <span className="capitalize">{issue.severity}</span>
                          </div>
                          
                          {/* Cost Impact */}
                          {issue.cost_impact_monthly > 0 && (
                            <div className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>~${issue.cost_impact_monthly.toLocaleString()}/mo</span>
                            </div>
                          )}
                          
                          {/* Time Savings */}
                          {issue.time_savings_minutes > 0 && (
                            <div className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{issue.time_savings_minutes} min saved</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Expand Indicator - Only in detailed view for complex processes */}
                        {!isSimpleProcess && viewMode === 'detailed' && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-blue-600 font-medium">
                            {expandedIssues[idx] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <span>{expandedIssues[idx] ? 'Hide details' : 'View details'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded Details - Only in detailed view for complex processes */}
                  {!isSimpleProcess && viewMode === 'detailed' && expandedIssues[idx] && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-200 bg-slate-50 space-y-3">
                      {/* Description */}
                      <div>
                        <div className="text-xs font-semibold text-slate-700 mb-1">The Issue</div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {issue.description}
                        </p>
                      </div>
                      
                      {/* Why This Matters */}
                      {issue.why_this_matters && (
                        <div>
                          <div className="text-xs font-semibold text-slate-700 mb-1">Why This Matters</div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {issue.why_this_matters}
                          </p>
                        </div>
                      )}
                      
                      {/* Risk Description */}
                      {issue.risk_description && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <div className="text-xs font-semibold text-red-700 mb-1">Risk</div>
                              <p className="text-xs text-red-600 leading-relaxed">
                                {issue.risk_description}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Evidence */}
                      {(issue.detected_pattern || issue.industry_benchmark || issue.failure_rate_estimate !== undefined) && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="text-xs font-semibold text-blue-700 mb-2">Evidence</div>
                          <div className="space-y-2">
                            {issue.detected_pattern && (
                              <div>
                                <span className="text-xs font-medium text-blue-700">Pattern: </span>
                                <span className="text-xs text-blue-600">{issue.detected_pattern}</span>
                              </div>
                            )}
                            {issue.industry_benchmark && (
                              <div>
                                <span className="text-xs font-medium text-blue-700">Common Practice: </span>
                                <span className="text-xs text-blue-600">{issue.industry_benchmark}</span>
                              </div>
                            )}
                            {issue.failure_rate_estimate !== undefined && (
                              <div>
                                <span className="text-xs font-medium text-blue-700">Est. Occurrence: </span>
                                <span className="text-xs text-blue-600">{issue.failure_rate_estimate}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Recommendation */}
                      {issue.recommendation_title && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <div className="text-xs font-semibold text-green-700 mb-1">
                                {issue.recommendation_title}
                              </div>
                              {issue.recommendation_description && (
                                <p className="text-xs text-green-600 leading-relaxed mb-2">
                                  {issue.recommendation_description}
                                </p>
                              )}
                              {issue.implementation_difficulty && (
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-200 text-green-800 text-xs font-semibold">
                                  Difficulty: {issue.implementation_difficulty}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* ROI Calculation */}
                      {issue.calculation_basis && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex gap-2">
                            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <div className="text-xs font-semibold text-amber-700 mb-1">How We Estimated This</div>
                              <p className="text-xs text-amber-600 leading-relaxed font-mono">
                                {issue.calculation_basis}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Show More Button - Summary View Only for complex processes */}
            {!isSimpleProcess && viewMode === 'summary' && intelligence.issues.length > 3 && (
              <button
                onClick={toggleViewMode}
                className="w-full mt-3 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <span>View All {intelligence.issues.length} Issues & Recommendations</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Recommendations - Only in detailed view */}
        {viewMode === 'detailed' && intelligence.recommendations && intelligence.recommendations.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              AI Recommendations ({intelligence.recommendations.length})
            </h3>
            <div className="space-y-3">
              {intelligence.recommendations.map((rec, idx) => (
                <div key={idx} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border-2 border-blue-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-slate-900 mb-1">
                        {rec.title}
                      </h4>
                      <p className="text-xs text-slate-600 mb-2 leading-relaxed">
                        {rec.description}
                      </p>
                      
                      {/* Why It Works */}
                      {rec.why_it_works && (
                        <div className="mb-2 p-2 bg-white/50 rounded-lg">
                          <div className="text-xs font-semibold text-blue-700 mb-1">Why This Works</div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {rec.why_it_works}
                          </p>
                        </div>
                      )}
                      
                      {/* Stats Row */}
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        {rec.savings_potential > 0 && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600">
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Save ${rec.savings_potential.toLocaleString()}/month</span>
                          </div>
                        )}
                        
                        {rec.affected_nodes && rec.affected_nodes.length > 0 && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600">
                            <Target className="w-3.5 h-3.5" />
                            <span>Steps: {rec.affected_nodes.join(', ')}</span>
                          </div>
                        )}
                        
                        {rec.implementation_effort && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-200 text-blue-800 text-xs font-semibold">
                            {rec.implementation_effort}
                          </div>
                        )}
                      </div>
                      
                      {/* Expected Impact */}
                      {rec.expected_impact && (
                        <div className="mt-2 text-xs text-slate-600 italic">
                          Impact: {rec.expected_impact}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessIntelligencePanel;
