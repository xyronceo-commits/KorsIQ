import React, { useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Loader2, Plus, Trash2 } from 'lucide-react';
import { StudioBrief, StudioOutlineItem } from '../types';

interface StudioOutlineReviewProps {
  brief: StudioBrief;
  outline: StudioOutlineItem[];
  onChangeOutline: (next: StudioOutlineItem[]) => void;
  onBackToBrief: () => void;
  onGenerate: () => void;
  isStartingJob: boolean;
}

export const StudioOutlineReview: React.FC<StudioOutlineReviewProps> = ({
  brief,
  outline,
  onChangeOutline,
  onBackToBrief,
  onGenerate,
  isStartingJob,
}) => {
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const isSlides = brief.fileFormat === 'pptx' || brief.docType === 'presentation';
  const totalBudget = outline.reduce((sum, item) => sum + (Number(item.targetWords) || 0), 0);

  const moveItem = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= outline.length) return;
    const copy = [...outline];
    const [removed] = copy.splice(idx, 1);
    copy.splice(target, 0, removed);
    onChangeOutline(copy.map((item, i) => ({ ...item, order: i })));
  };

  const updateItem = (idx: number, patch: Partial<StudioOutlineItem>) => {
    const copy = outline.map((item, i) => (i === idx ? { ...item, ...patch } : item));
    onChangeOutline(copy);
  };

  const deleteItem = (idx: number) => {
    const copy = outline.filter((_, i) => i !== idx).map((item, i) => ({ ...item, order: i }));
    onChangeOutline(copy);
  };

  const addItem = () => {
    const title = newSectionTitle.trim();
    if (!title) return;
    const next: StudioOutlineItem = {
      id: `sec_custom_${Date.now()}`,
      title,
      level: 1,
      order: outline.length,
      kind: isSlides ? 'slide' : 'body',
      description: '',
      targetWords: isSlides ? 80 : 350,
      approved: true,
    };
    onChangeOutline([...outline, next]);
    setNewSectionTitle('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#111827] dark:text-white">
            Review Outline
          </h1>
          <p className="text-xs sm:text-sm text-[#5B6472] dark:text-slate-400 mt-0.5">
            Nothing is written yet. Rename, reorder, add, or remove parts, then click Generate.
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToBrief}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-xs font-medium text-[#111827] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[44px] cursor-pointer"
        >
          <ArrowLeft size={15} />
          <span>Edit Brief</span>
        </button>
      </div>

      <div className="bg-[#EFF6FF] dark:bg-blue-950/40 border border-[#E5E7EB] dark:border-blue-900 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#1746A2] dark:text-blue-200">
        <span className="font-medium">
          {brief.title} ({brief.fileFormat.toUpperCase()})
        </span>
        <span>
          {outline.length} parts · ~{totalBudget.toLocaleString()} words planned
        </span>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg divide-y divide-[#E5E7EB] dark:divide-slate-800">
        {outline.map((item, idx) => (
          <div key={item.id} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xs font-mono text-[#5B6472] w-6 shrink-0">{idx + 1}.</span>
              <input
                type="text"
                value={item.title}
                onChange={(e) => updateItem(idx, { title: e.target.value })}
                aria-label={`Section ${idx + 1} title`}
                className="flex-1 min-w-0 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-sm font-medium text-[#111827] dark:text-white min-h-[44px]"
              />
            </div>

            <div className="flex items-center gap-2 justify-end shrink-0">
              <label className="flex items-center gap-1.5 text-xs text-[#5B6472]">
                <span>{isSlides ? 'Words/slide:' : 'Words:'}</span>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={item.targetWords}
                  onChange={(e) => updateItem(idx, { targetWords: Math.max(0, Number(e.target.value) || 0) })}
                  aria-label={`${item.title} word budget`}
                  className="w-20 px-2 py-1.5 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-xs text-[#111827] dark:text-white min-h-[44px]"
                />
              </label>

              <button
                type="button"
                onClick={() => moveItem(idx, -1)}
                disabled={idx === 0}
                aria-label={`Move ${item.title} up`}
                className="p-2 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-[#5B6472] hover:text-[#111827] disabled:opacity-40 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <ArrowUp size={15} />
              </button>
              <button
                type="button"
                onClick={() => moveItem(idx, 1)}
                disabled={idx === outline.length - 1}
                aria-label={`Move ${item.title} down`}
                className="p-2 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-[#5B6472] hover:text-[#111827] disabled:opacity-40 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <ArrowDown size={15} />
              </button>
              <button
                type="button"
                onClick={() => deleteItem(idx)}
                aria-label={`Delete ${item.title}`}
                className="p-2 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-rose-600 hover:bg-rose-50 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Section */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newSectionTitle}
          onChange={(e) => setNewSectionTitle(e.target.value)}
          placeholder={isSlides ? 'Add a new slide title...' : 'Add a new section title...'}
          className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-sm min-h-[44px]"
        />
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 hover:border-[#2563EB] text-[#111827] dark:text-white rounded-lg text-xs font-medium min-h-[44px] cursor-pointer"
        >
          <Plus size={15} />
          <span>Add</span>
        </button>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onGenerate}
          disabled={isStartingJob || outline.length === 0}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#2563EB] hover:bg-[#1746A2] disabled:opacity-60 text-white rounded-lg text-sm font-semibold min-h-[44px] cursor-pointer"
        >
          {isStartingJob ? <Loader2 size={16} className="animate-spin" /> : null}
          <span>{isStartingJob ? 'Starting...' : isSlides ? 'Generate Slides' : 'Generate Document'}</span>
        </button>
      </div>
    </div>
  );
};

export default StudioOutlineReview;
