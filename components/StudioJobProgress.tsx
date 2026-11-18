import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, X, RotateCcw, Trash2 } from 'lucide-react';
import { StudioJob } from '../types';

interface StudioJobProgressProps {
  job: StudioJob;
  documentTitle?: string;
  onCancel: (jobId: string) => void;
  onResume: (jobId: string) => void;
  onDeleteDocument?: (documentId: string) => void;
  onOpenDocument: (documentId: string) => void;
}

export const StudioJobProgress: React.FC<StudioJobProgressProps> = ({
  job,
  documentTitle,
  onCancel,
  onResume,
  onDeleteDocument,
  onOpenDocument,
}) => {
  const isRunning = job.status === 'queued' || job.status === 'running';
  const isCancelled = job.status === 'cancelled';
  const isFailed = job.status === 'failed';
  const isDone = job.status === 'completed' || job.status === 'completed_with_issues';

  const partNumber = Math.min(job.currentStep + 1, Math.max(1, job.totalSteps));
  const labelText =
    job.jobKind === 'convert_to_slides'
      ? 'Converting document to slides...'
      : job.jobKind === 'convert_to_document'
      ? 'Converting slides to document...'
      : isRunning
      ? `Generating ${documentTitle ? `"${documentTitle}"` : 'your document'}, part ${partNumber} of ${job.totalSteps}`
      : isCancelled
      ? `Cancelled at part ${partNumber} of ${job.totalSteps}`
      : isFailed
      ? `Generation stopped at part ${partNumber} of ${job.totalSteps}`
      : job.status === 'completed_with_issues'
      ? `${documentTitle || 'Document'} ready (some parts need attention)`
      : `${documentTitle || 'Document'} is ready`;

  return (
    <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {isRunning ? (
            <Loader2 size={18} className="animate-spin text-[#2563EB] shrink-0" />
          ) : isDone ? (
            <CheckCircle2 size={18} className="text-[#2563EB] shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-amber-600 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#111827] dark:text-white truncate">
              {labelText}
            </p>
            {isRunning && (
              <p className="text-xs text-[#5B6472] dark:text-slate-400">
                Runs in the background. You can navigate away or close the app.
              </p>
            )}
            {job.error && (isFailed || isCancelled) && (
              <p className="text-xs text-rose-600 mt-0.5">{job.error}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isRunning && (
            <button
              type="button"
              onClick={() => onCancel(job.id)}
              disabled={job.cancelRequested}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-xs font-medium text-[#111827] dark:text-slate-200 hover:bg-slate-50 min-h-[44px] cursor-pointer"
            >
              <X size={14} />
              <span>{job.cancelRequested ? 'Cancelling...' : 'Cancel'}</span>
            </button>
          )}

          {(isCancelled || isFailed) && (
            <>
              <button
                type="button"
                onClick={() => onResume(job.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#2563EB] hover:bg-[#1746A2] text-white rounded-lg text-xs font-medium min-h-[44px] cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Resume</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenDocument(job.documentId)}
                className="px-3 py-2 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-xs font-medium text-[#111827] dark:text-slate-200 min-h-[44px] cursor-pointer"
              >
                Open Partial Draft
              </button>
              {onDeleteDocument && (
                <button
                  type="button"
                  onClick={() => onDeleteDocument(job.documentId)}
                  aria-label="Delete partial draft"
                  className="p-2 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-rose-600 hover:bg-rose-50 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </>
          )}

          {isDone && (
            <button
              type="button"
              onClick={() => onOpenDocument(job.documentId)}
              className="px-4 py-2 bg-[#2563EB] hover:bg-[#1746A2] text-white rounded-lg text-xs font-semibold min-h-[44px] cursor-pointer"
            >
              Open Document
            </button>
          )}
        </div>
      </div>

      {isRunning && (
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#2563EB] transition-all duration-300"
            style={{ width: `${Math.max(4, job.progress)}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default StudioJobProgress;
