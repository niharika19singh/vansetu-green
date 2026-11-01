import React from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[ErrorBoundary] Captured error in ${this.props.featureName || 'Application'}:`, error, errorInfo);
    this.setState({ errorInfo });
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback({ error: this.state.error, reset: this.handleReset })
          : this.props.fallback;
      }

      const featureTitle = this.props.featureName || 'Feature Module';

      return (
        <div className="min-h-[380px] h-full flex items-center justify-center p-6 bg-[#071C16] text-slate-100">
          <div className="max-w-xl w-full p-6 rounded-2xl bg-[#0D2821] border border-emerald-900/50 shadow-2xl space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Resilience Shield Activated
                </span>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {featureTitle} Encountered an Issue
                </h2>
                <p className="text-xs text-emerald-200/70 leading-relaxed">
                  The application shielded this module from crashing the wider VanSetu platform.
                  Other workspace tools and maps remain fully operational.
                </p>
              </div>
            </div>

            {/* Error Message Box */}
            <div className="p-3.5 rounded-xl bg-[#071C16] border border-emerald-950 font-mono text-xs text-rose-300 overflow-x-auto">
              <div className="font-semibold text-rose-400 mb-1">Error Signature:</div>
              <div className="truncate">{this.state.error?.message || 'Unknown runtime exception'}</div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-emerald-900/30">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-md shadow-emerald-950"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry {featureTitle}</span>
              </button>

              {this.props.onNavigate && (
                <button
                  type="button"
                  onClick={() => this.props.onNavigate('map')}
                  className="px-3.5 py-2 rounded-xl bg-[#071C16] hover:bg-emerald-950/80 border border-emerald-800/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Climate Map</span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
