import React, { useState } from 'react';
import { Sparkles, AlertTriangle, CheckCircle, TrendingUp, DollarSign, Clock, Activity, RefreshCw, ChevronDown, ChevronRight, AlertCircle, Zap, Users, Timer, FileText, Target, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ProcessIntelligencePanel = ({ intelligence, loading, onRefresh, onRegenerate }) => {
  const [expandedIssues, setExpandedIssues] = useState({});
  const [expandedScores, setExpandedScores] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

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
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">Process Intelligence</h2>
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
            <Button variant="ghost" size="sm" onClick={onRefresh}>
              <Sparkles className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Health Score */}
        <div className={`rounded-xl p-6 border-2 mb-6 ${getHealthBgColor(intelligence.health_score)}`}>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Activity className={`w-5 h-5 ${getHealthColor(intelligence.health_score)}`} />
            </div>
            <div className={`text-5xl font-bold ${getHealthColor(intelligence.health_score)} mb-2`}>
              {intelligence.health_score}
            </div>
            <p className="text-sm font-semibold text-slate-700">Health Score</p>
          </div>

          {/* Score Breakdown */}
          {intelligence.score_breakdown && (
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

        {/* Benchmarks */}
        {intelligence.benchmarks && (
          <div className="bg-white rounded-xl p-4 border border-slate-200 mb-6">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Industry Benchmark
            </h3>
            <div className="space-y-3">
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
              <div className={`px-3 py-2 rounded-lg text-xs font-semibold text-center ${
                intelligence.benchmarks.industry_comparison === 'faster' ? 'bg-green-50 text-green-700' :
                intelligence.benchmarks.industry_comparison === 'slower' ? 'bg-red-50 text-red-700' :
                'bg-blue-50 text-blue-700'
              }`}>
                {intelligence.benchmarks.industry_comparison === 'faster' ? '✓ Faster than average' :
                 intelligence.benchmarks.industry_comparison === 'slower' ? '⚠ Slower than average' :
                 '= Average speed'}
              </div>
            </div>
          </div>
        )}

        {/* Issues */}
        {intelligence.issues && intelligence.issues.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Issues Detected ({intelligence.issues.length})</h3>
            <div className="space-y-3">
              {intelligence.issues.map((issue, idx) => (
                <div key={idx} className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${getSeverityColor(issue.severity)}`}>
                      {getSeverityIcon(issue.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-slate-900 mb-1">
                        {issue.title}
                      </h4>
                      <p className="text-xs text-slate-600 mb-2 leading-relaxed">
                        {issue.description}
                      </p>
                      {issue.cost_impact > 0 && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>${issue.cost_impact.toLocaleString()}/month cost</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {intelligence.recommendations && intelligence.recommendations.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              AI Recommendations
            </h3>
            <div className="space-y-3">
              {intelligence.recommendations.map((rec, idx) => (
                <div key={idx} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
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
                      {rec.savings_potential > 0 && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600 mb-2">
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Save ${rec.savings_potential.toLocaleString()}/month</span>
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
