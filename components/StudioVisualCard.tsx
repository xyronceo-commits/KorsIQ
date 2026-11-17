import React from 'react';
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Cpu,
  GitBranch,
  Globe,
  Layers,
  Shield,
  Sparkles,
  Table2,
  Target,
  Trash2,
  Zap,
} from 'lucide-react';
import { StudioDesignStyle, StudioVisualBlock } from '../types';

interface StudioVisualCardProps {
  block: StudioVisualBlock;
  designStyle?: StudioDesignStyle;
  onRemove?: () => void;
}

const KIND_LABELS: Record<StudioVisualBlock['kind'], string> = {
  infographic: 'Infographic',
  diagram: 'Concept Diagram',
  flowchart: 'Process Flowchart',
  chart: 'Data Chart',
  illustration: 'Academic Illustration',
  icon_callout: 'Key Concepts',
  comparison_table: 'Comparison Table',
};

function renderItemIcon(name?: string) {
  const cls = 'text-blue-600 shrink-0';
  switch ((name || '').toLowerCase()) {
    case 'cpu':
      return <Cpu size={14} className={cls} />;
    case 'layers':
      return <Layers size={14} className={cls} />;
    case 'check':
      return <CheckCircle2 size={14} className={cls} />;
    case 'target':
      return <Target size={14} className={cls} />;
    case 'globe':
      return <Globe size={14} className={cls} />;
    case 'shield':
      return <Shield size={14} className={cls} />;
    case 'zap':
      return <Zap size={14} className={cls} />;
    default:
      return <BookOpen size={14} className={cls} />;
  }
}

export const StudioVisualCard: React.FC<StudioVisualCardProps> = ({
  block,
  designStyle = 'classic_academic',
  onRemove,
}) => {
  const isClassic = designStyle === 'classic_academic';

  return (
    <div
      className={`my-4 rounded-lg border bg-white text-slate-900 overflow-hidden ${
        isClassic ? 'border-slate-300 font-serif' : 'border-blue-200 font-sans'
      }`}
    >
      {/* Header */}
      <div
        className={`px-4 py-2.5 border-b flex items-center justify-between gap-3 ${
          isClassic
            ? 'bg-slate-50 border-slate-200'
            : 'bg-blue-50/70 border-blue-100'
        }`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 font-sans">
            {block.kind === 'chart' ? (
              <BarChart3 size={12} />
            ) : block.kind === 'flowchart' ? (
              <GitBranch size={12} />
            ) : block.kind === 'comparison_table' ? (
              <Table2 size={12} />
            ) : (
              <Sparkles size={12} />
            )}
            <span>{KIND_LABELS[block.kind] || 'Visual Figure'}</span>
          </div>
          <h4 className="text-sm font-bold text-slate-900 leading-snug mt-0.5">
            {block.title}
          </h4>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            title="Remove visual element"
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {block.kind === 'chart' && block.dataPoints && block.dataPoints.length > 0 && (
          <div className="space-y-2">
            {(() => {
              const pts = block.dataPoints!;
              const maxVal = Math.max(...pts.map((p) => Math.abs(p.value)), 1);
              if (block.chartType === 'line') {
                const w = 560;
                const h = 180;
                const padL = 44;
                const padR = 24;
                const padT = 22;
                const padB = 34;
                const plotW = w - padL - padR;
                const plotH = h - padT - padB;
                const stepX = pts.length > 1 ? plotW / (pts.length - 1) : plotW / 2;
                const coords = pts.map((p, i) => ({
                  x: padL + (pts.length > 1 ? i * stepX : plotW / 2),
                  y: padT + plotH - (p.value / maxVal) * (plotH - 8),
                  p,
                }));
                const pathD = coords
                  .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x} ${c.y}`)
                  .join(' ');
                return (
                  <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto max-h-56">
                    <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="#94A3B8" strokeWidth="1" />
                    <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke="#94A3B8" strokeWidth="1" />
                    <path d={pathD} fill="none" stroke="#2563EB" strokeWidth="2.5" />
                    {coords.map((c, idx) => (
                      <g key={idx}>
                        <circle cx={c.x} cy={c.y} r="4" fill="#2563EB" />
                        <text x={c.x} y={c.y - 8} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0F172A">
                          {c.p.value}{c.p.unit || ''}
                        </text>
                        <text x={c.x} y={padT + plotH + 16} textAnchor="middle" fontSize="10" fill="#475569">
                          {c.p.label.length > 12 ? `${c.p.label.slice(0, 10)}..` : c.p.label}
                        </text>
                      </g>
                    ))}
                  </svg>
                );
              }
              return (
                <div className="space-y-2">
                  {pts.map((pt, idx) => {
                    const pct = Math.max(4, Math.round((Math.abs(pt.value) / maxVal) * 100));
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-sans">
                          <span className="font-medium text-slate-700">{pt.label}</span>
                          <span className="font-bold text-slate-900">
                            {pt.value}{pt.unit || ''}
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-sm overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-sm"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            {(block.xLabel || block.yLabel) && (
              <p className="text-[11px] text-slate-500 font-sans">
                {[block.xLabel && `X: ${block.xLabel}`, block.yLabel && `Y: ${block.yLabel}`]
                  .filter(Boolean)
                  .join(' • ')}
              </p>
            )}
          </div>
        )}

        {block.kind === 'flowchart' && block.steps && block.steps.length > 0 && (
          <div className="space-y-2">
            {block.steps.map((step, idx) => (
              <React.Fragment key={step.id || idx}>
                <div className="flex items-start gap-3 p-3 rounded-lg border border-blue-200 bg-blue-50/50 font-sans">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900">{step.label}</p>
                    {step.detail && (
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                        {step.detail}
                      </p>
                    )}
                  </div>
                </div>
                {idx < block.steps!.length - 1 && (
                  <div className="flex justify-center text-blue-600 text-xs font-bold leading-none select-none">
                    ↓
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {block.kind === 'comparison_table' && block.headers && block.rows && (
          <div className="overflow-x-auto border border-slate-200 rounded-lg font-sans">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-blue-600 text-white">
                <tr>
                  {block.headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 font-semibold border-r border-blue-500 last:border-r-0">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {block.rows.map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    {block.headers!.map((_, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-slate-700 border-r border-slate-200 last:border-r-0 align-top">
                        {row[cIdx] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {block.items && block.items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-sans">
            {block.items.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 flex items-start gap-2.5"
              >
                {renderItemIcon(item.icon)}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900">{item.label}</p>
                  {item.detail && (
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      {item.detail}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {block.caption && (
          <p className="text-[11px] italic text-slate-500 pt-1 border-t border-slate-100">
            {block.caption}
          </p>
        )}
      </div>
    </div>
  );
};

export default StudioVisualCard;
