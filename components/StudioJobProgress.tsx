import React, { useState } from 'react';
import { X, RotateCcw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { StudioJob, StudioSection } from '../types';
import { AILiveStatus, AILiveStage } from './AILiveStatus';

interface StudioJobProgressProps {
  job: StudioJob;
  documentTitle?: string;
  draftedSections?: StudioSection[];
  onCancel: (jobId: string) => void;
  onResume: (jobId: string) => void;
  onDeleteDocument?: (documentId: string) => void;
  onOpenDocument: (documentId: string) => void;
}

export const StudioJobProgress: React.FC<StudioJobProgressProps> = ({
  job,
  documentTitle,
  draftedSections = [],
  onCancel,
  onResume,
  onDeleteDocument,
  onOpenDocument,
}) => {
  const [showPreview, setShowPreview] = useState(true);
  const isRunning = job.status === 'queued' || job.status === 'running';
  const isCancelled = job.status === 'cancelled';
  const isFailed = job.status === 'failed';
  const isDone = job.status === 'completed' || job.status === 'completed_with_issues';

  const partNumber = Math.min(job.currentStep + 1, Math.max(1, job.totalSteps));
  const activeStep = job.plan[job.currentStep];

  const titleText =
    job.jobKind === 'convert_to_slides'
      ? 'Converting document to slides'
      : job.jobKind === 'convert_to_document'
      ? 'Expanding slides to document'
      : isRunning
      ? `Preparing ${documentTitle ? `"${documentTitle}"` : 'your document'}`
      : isCancelled
      ? `Cancelled at part ${partNumber} of ${job.totalSteps}`
      : isFailed
      ? `Stopped at part ${partNumber} of ${job.totalSteps}`
      : job.status === 'completed_with_issues'
      ? `${documentTitle || 'Document'} ready (some parts need attention)`
      : `${documentTitle || 'Document'} is ready`;

  const statusText = isRunning
    ? activeStep?.label
      ? `${activeStep.label}... (part ${partNumber} of ${job.totalSteps})`
      : `Generating part ${partNumber} of ${job.totalSteps}...`
    : job.error && (isFailed || isCancelled)
    ? job.error
    : isDone
    ? 'All stages finished. Ready to preview and download.'
    : undefined;

  // Map real job.plan steps into live stage indicators (never fabricated)
  const stages: AILiveStage[] = (job.plan || []).map((step, idx) => {
    let status: AILiveStage['status'] = 'pending';
    if (step.status === 'completed') status = 'completed';
    else if (step.status === 'needs_attention') status = 'needs_attention';
    else if (step.status === 'running' || (isRunning && idx === job.currentStep)) status = 'active';
    return {
      id: step.id || `step_${idx}`,
      label: status === 'active' ? `${step.label}...` : step.label,
      status,
    };
  });

  const completedDrafts = draftedSections.filter((s) => s.content && s.content.trim().length > 0);

  return (
    <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <AILiveStatus
            title={titleText}
            statusText={statusText}
            state={
              isRunning
                ? 'active'
                : isDone
                ? 'completed'
                : isCancelled
                ? 'cancelled'
                : 'error'
            }
            stages={isRunning ? stages : undefined}
            className="border-0 p-0 bg-transparent"
          />
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
        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#2563EB] transition-all duration-300"
            style={{ width: `${Math.max(4, job.progress)}%` }}
          />
        </div>
      )}

      {/* Progressive Content Preview as sections finish */}
      {isRunning && completedDrafts.length > 0 && (
        <div className="pt-2 border-t border-[#E5E7EB] dark:border-slate-800 space-y-2">
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className="flex items-center justify-between w-full text-xs font-medium text-[#2563EB] hover:text-[#1746A2] cursor-pointer"
          >
            <span>Live draft preview ({completedDrafts.length} {completedDrafts.length === 1 ? 'part' : 'parts'} written)</span>
            {showPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showPreview && (
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {completedDrafts.map((sec) => (
                <div key={sec.id} className="p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-[#E5E7EB] dark:border-slate-800 rounded-lg">
                  <p className="text-xs font-semibold text-[#111827] dark:text-white">{sec.title}</p>
                  <p className="text-xs text-[#5B6472] dark:text-slate-300 mt-1 line-clamp-3 whitespace-pre-wrap">
                    {sec.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudioJobProgress;
