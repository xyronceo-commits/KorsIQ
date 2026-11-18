import React from 'react';
import { Check, AlertCircle } from 'lucide-react';

export interface AILiveStage {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'needs_attention';
}

interface AILiveStatusProps {
  /** Primary heading, e.g. "KorsIQ is working" or "Preparing your report" */
  title?: string;
  /** Contextual status message beside/beneath the circular indicator */
  statusText?: string;
  /** Overall state */
  state?: 'active' | 'completed' | 'error' | 'cancelled';
  /** Optional real workflow stages (never fabricated) */
  stages?: AILiveStage[];
  /** Compact inline mode for chat messages */
  compact?: boolean;
  className?: string;
}

export const CircularThinkingIndicator: React.FC<{
  state?: 'active' | 'completed' | 'error' | 'cancelled';
  size?: 'sm' | 'md';
}> = ({ state = 'active', size = 'md' }) => {
  const dim = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  if (state === 'completed') {
    return (
      <span
        className={`${dim} rounded-full bg-[#2563EB] text-white inline-flex items-center justify-center shrink-0 transition-all duration-200`}
        aria-hidden="true"
      >
        <Check size={size === 'sm' ? 10 : 12} strokeWidth={2.5} />
      </span>
    );
  }

  if (state === 'error' || state === 'cancelled') {
    return (
      <span
        className={`${dim} rounded-full bg-slate-100 dark:bg-slate-800 text-[#111827] dark:text-slate-200 border border-[#E5E7EB] dark:border-slate-700 inline-flex items-center justify-center shrink-0`}
        aria-hidden="true"
      >
        <AlertCircle size={size === 'sm' ? 11 : 13} />
      </span>
    );
  }

  return (
    <span className={`relative ${dim} inline-flex items-center justify-center shrink-0`} aria-hidden="true">
      <span className="absolute inset-0 rounded-full border-2 border-[#E5E7EB] dark:border-slate-700" />
      <span className="absolute inset-0 rounded-full border-2 border-[#2563EB] border-t-transparent animate-spin" />
      <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
    </span>
  );
};

export const AILiveStatus: React.FC<AILiveStatusProps> = ({
  title = 'KorsIQ is working',
  statusText,
  state = 'active',
  stages,
  compact = false,
  className = '',
}) => {
  if (compact) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`inline-flex items-center gap-2.5 text-xs text-[#111827] dark:text-slate-200 ${className}`}
      >
        <CircularThinkingIndicator state={state} size="sm" />
        <span className="font-medium text-[#5B6472] dark:text-slate-300">
          {statusText || title}
        </span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg p-4 space-y-3 ${className}`}
    >
      <div className="flex items-center gap-3">
        <CircularThinkingIndicator state={state} size="md" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#111827] dark:text-white leading-tight">
            {title}
          </p>
          {statusText && (
            <p className="text-xs text-[#5B6472] dark:text-slate-400 mt-0.5 truncate">
              {statusText}
            </p>
          )}
        </div>
      </div>

      {stages && stages.length > 0 && (
        <ul className="space-y-1.5 pt-2 border-t border-[#E5E7EB] dark:border-slate-800">
          {stages.map((stage) => (
            <li
              key={stage.id}
              className={`flex items-center gap-2.5 text-xs transition-colors ${
                stage.status === 'active'
                  ? 'text-[#111827] dark:text-white font-medium'
                  : stage.status === 'completed'
                  ? 'text-[#5B6472] dark:text-slate-400'
                  : stage.status === 'needs_attention'
                  ? 'text-amber-700 dark:text-amber-400 font-medium'
                  : 'text-[#5B6472]/70 dark:text-slate-500'
              }`}
            >
              {stage.status === 'completed' ? (
                <Check size={14} className="text-[#2563EB] shrink-0" aria-hidden="true" />
              ) : stage.status === 'active' ? (
                <CircularThinkingIndicator state="active" size="sm" />
              ) : stage.status === 'needs_attention' ? (
                <AlertCircle size={14} className="text-amber-600 shrink-0" aria-hidden="true" />
              ) : (
                <span
                  className="w-3.5 h-3.5 rounded-full border border-[#E5E7EB] dark:border-slate-700 inline-block shrink-0"
                  aria-hidden="true"
                />
              )}
              <span className="truncate">{stage.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AILiveStatus;
