import React from 'react';
import {
  StudioDesignStyle,
  StudioVisualIntensity,
  StudioVisualPreferences,
} from '../types';
import { DEFAULT_VISUAL_PREFERENCES } from '../utils/visualRenderer';

interface StudioVisualDesignPanelProps {
  value: StudioVisualPreferences;
  onChange: (next: StudioVisualPreferences) => void;
  onSkip?: () => void;
}

const DESIGN_STYLES: Array<{
  id: StudioDesignStyle;
  label: string;
  description: string;
}> = [
  {
    id: 'classic_academic',
    label: 'Classic Academic',
    description: 'Formal, clean, and traditional scholarly typography.',
  },
  {
    id: 'modern_professional',
    label: 'Modern Professional',
    description: 'Contemporary typography, spacing, and structured layouts.',
  },
  {
    id: 'infographic',
    label: 'Infographic',
    description: 'Structured layout suited for information graphics and diagrams.',
  },
  {
    id: 'creative_visual',
    label: 'Creative Visual',
    description: 'Expressive layouts and structured visual storytelling.',
  },
];

const VISUAL_ELEMENTS: Array<{
  key: keyof StudioVisualPreferences['enabledElements'];
  label: string;
  description: string;
}> = [
  {
    key: 'infographics',
    label: 'Infographics',
    description: 'Structured visual summaries of key concepts.',
  },
  {
    key: 'diagrams',
    label: 'Diagrams',
    description: 'Labelled architectural and conceptual diagrams.',
  },
  {
    key: 'flowcharts',
    label: 'Flowcharts',
    description: 'Step-by-step process and methodology flows.',
  },
  {
    key: 'charts',
    label: 'Charts and graphs',
    description: 'Quantitative charts (only when real data is available).',
  },
  {
    key: 'illustrations',
    label: 'Illustrations',
    description: 'Clean academic conceptual illustrations.',
  },
  {
    key: 'icons',
    label: 'Icons',
    description: 'Visual concept callouts with structured icons.',
  },
  {
    key: 'comparisonTables',
    label: 'Visual comparison tables',
    description: 'Formatted multi-column comparison matrices.',
  },
];

const INTENSITY_LEVELS: Array<{
  id: StudioVisualIntensity;
  label: string;
  description: string;
}> = [
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Primarily text with subtle visual elements.',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'A mixture of text and selected visuals.',
  },
  {
    id: 'visual_rich',
    label: 'Visual-rich',
    description: 'More extensive visual explanations and graphics.',
  },
];

export const StudioVisualDesignPanel: React.FC<StudioVisualDesignPanelProps> = ({
  value,
  onChange,
  onSkip,
}) => {
  const enabledCount = Object.values(value.enabledElements).filter(Boolean).length;

  const setDesignStyle = (designStyle: StudioDesignStyle) => {
    // Selecting a design style never automatically enables visual elements
    onChange({
      ...value,
      customized: true,
      designStyle,
    });
  };

  const toggleElement = (key: keyof StudioVisualPreferences['enabledElements']) => {
    onChange({
      ...value,
      customized: true,
      enabledElements: {
        ...value.enabledElements,
        [key]: !value.enabledElements[key],
      },
    });
  };

  const setIntensity = (intensity: StudioVisualIntensity) => {
    onChange({
      ...value,
      customized: true,
      intensity,
    });
  };

  return (
    <div className="space-y-5">
      {/* Optional Notice & Skip Action */}
      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-slate-900 dark:text-white">
            Visual customisation is optional
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {enabledCount === 0
              ? 'All visual elements are disabled by default for standard text-based academic documents.'
              : `${enabledCount} optional visual element${enabledCount > 1 ? 's' : ''} enabled.`}
          </p>
        </div>
        {onSkip && (
          <button
            type="button"
            onClick={() => {
              onChange({ ...DEFAULT_VISUAL_PREFERENCES, customized: false });
              onSkip();
            }}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold shrink-0 cursor-pointer min-h-[38px]"
          >
            Skip &amp; Use Standard Formatting
          </button>
        )}
      </div>

      {/* A. Design Styles */}
      <div className="space-y-2">
        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
          A. Design Style
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {DESIGN_STYLES.map((style) => {
            const active = value.designStyle === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => setDesignStyle(style.id)}
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  active
                    ? 'border-[#2563EB] bg-[#EFF6FF] dark:bg-blue-950/40'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-semibold ${
                      active
                        ? 'text-[#2563EB] dark:text-blue-300'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {style.label}
                  </span>
                  <span
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      active
                        ? 'border-[#2563EB] bg-[#2563EB]'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                  {style.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* B. Optional Visual Elements */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            B. Optional Visual Elements (Disabled by Default)
          </label>
          {enabledCount > 0 && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  enabledElements: { ...DEFAULT_VISUAL_PREFERENCES.enabledElements },
                })
              }
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {VISUAL_ELEMENTS.map((el) => {
            const checked = value.enabledElements[el.key];
            return (
              <label
                key={el.key}
                className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-colors ${
                  checked
                    ? 'border-[#2563EB] bg-[#EFF6FF]/60 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleElement(el.key)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                />
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                    {el.label}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug block">
                    {el.description}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* C. Visual Intensity */}
      <div className="space-y-2">
        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
          C. Visual Intensity
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {INTENSITY_LEVELS.map((lvl) => {
            const active = value.intensity === lvl.id;
            return (
              <button
                key={lvl.id}
                type="button"
                onClick={() => setIntensity(lvl.id)}
                className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                  active
                    ? 'border-[#2563EB] bg-[#EFF6FF] dark:bg-blue-950/40'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <span
                  className={`text-xs font-semibold block ${
                    active
                      ? 'text-[#2563EB] dark:text-blue-300'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {lvl.label}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block leading-snug">
                  {lvl.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StudioVisualDesignPanel;
