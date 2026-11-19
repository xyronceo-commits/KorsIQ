import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, X, FileText, File, Presentation, Download, ArrowUpRight, AlertCircle, RotateCcw } from 'lucide-react';
import { Course, UserFile } from '../types';
import { DBService } from '../services/db';
import { getCurrentUserId } from '../lib/supabase';
import { toSafeExternalUrl } from '../lib/urlSafety';

export type ResourceFileTypeFilter = 'PDF' | 'PPT' | 'DOCX';

export interface ResourceSearchProps {
  courses?: Course[];
  /** Called when the user opens a result (e.g. loads into Study Hub workbench or opens study tools). */
  onOpenFile?: (file: UserFile) => void;
  /** Label for the primary open action button (e.g. "Open in Hub" or "Open"). */
  openActionLabel?: string;
  /** Notifies parent when search is expanded/collapsed so the header layout can adapt cleanly. */
  onExpandedChange?: (expanded: boolean) => void;
  /** Notifies parent when a search query or filter is active (results are being shown). */
  onActiveSearchChange?: (active: boolean) => void;
  placeholder?: string;
  className?: string;
}

const FILE_TYPE_OPTIONS: ResourceFileTypeFilter[] = ['PDF', 'PPT', 'DOCX'];

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim();
  if (!trimmed) return <>{text}</>;

  const regex = new RegExp(`(${escapeRegExp(trimmed)})`, 'ig');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, idx) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark
            key={idx}
            className="bg-[#EFF6FF] text-[#1746A2] dark:bg-blue-900/60 dark:text-blue-200 rounded px-0.5 font-semibold"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={idx}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

function getResourceFileIcon(file: UserFile) {
  const name = (file.fileName || '').toLowerCase();
  const mime = (file.fileType || '').toLowerCase();

  if (name.endsWith('.pdf') || mime.includes('pdf')) {
    return (
      <div
        className="w-8 h-8 rounded-lg bg-[#EFF6FF] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 border border-[#E5E7EB] dark:border-blue-900 flex items-center justify-center shrink-0"
        aria-hidden="true"
      >
        <FileText size={15} />
      </div>
    );
  }

  if (name.endsWith('.ppt') || name.endsWith('.pptx') || mime.includes('presentation') || mime.includes('powerpoint')) {
    return (
      <div
        className="w-8 h-8 rounded-lg bg-[#EFF6FF] dark:bg-blue-950/60 text-[#1746A2] dark:text-blue-300 border border-[#E5E7EB] dark:border-blue-900 flex items-center justify-center shrink-0"
        aria-hidden="true"
      >
        <Presentation size={15} />
      </div>
    );
  }

  if (name.endsWith('.doc') || name.endsWith('.docx') || mime.includes('word') || mime.includes('document')) {
    return (
      <div
        className="w-8 h-8 rounded-lg bg-[#EFF6FF] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 border border-[#E5E7EB] dark:border-blue-900 flex items-center justify-center shrink-0"
        aria-hidden="true"
      >
        <FileText size={15} />
      </div>
    );
  }

  return (
    <div
      className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#5B6472] dark:text-slate-300 border border-[#E5E7EB] dark:border-slate-700 flex items-center justify-center shrink-0"
      aria-hidden="true"
    >
      <File size={15} />
    </div>
  );
}

export const ResourceSearch: React.FC<ResourceSearchProps> = ({
  courses = [],
  onOpenFile,
  openActionLabel = 'Open',
  onExpandedChange,
  onActiveSearchChange,
  placeholder = 'Search by title or course code...',
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedFileType, setSelectedFileType] = useState<ResourceFileTypeFilter | null>(null);
  const [selectedCourseCode, setSelectedCourseCode] = useState<string | null>(null);

  const [results, setResults] = useState<UserFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCounter, setRetryCounter] = useState(0);

  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const uniqueCourseCodes = useMemo(() => {
    const seen = new Set<string>();
    const codes: string[] = [];
    for (const c of courses) {
      const code = (c.code || '').trim();
      if (code && !seen.has(code)) {
        seen.add(code);
        codes.push(code);
      }
    }
    return codes;
  }, [courses]);

  const hasActiveCriteria = Boolean(
    debouncedQuery.trim() || selectedFileType || selectedCourseCode
  );
  const hasImmediateCriteria = Boolean(
    query.trim() || selectedFileType || selectedCourseCode
  );

  // Notify parent of expansion and active-search state
  useEffect(() => {
    onExpandedChange?.(isExpanded);
  }, [isExpanded, onExpandedChange]);

  useEffect(() => {
    onActiveSearchChange?.(isExpanded && hasImmediateCriteria);
  }, [isExpanded, hasImmediateCriteria, onActiveSearchChange]);

  // Debounce text input by 250ms
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const openSearch = useCallback(() => {
    setIsExpanded(true);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  const closeAndClearSearch = useCallback(() => {
    abortControllerRef.current?.abort();
    requestIdRef.current += 1;
    setIsExpanded(false);
    setQuery('');
    setDebouncedQuery('');
    setSelectedFileType(null);
    setSelectedCourseCode(null);
    setResults([]);
    setError(null);
    setLoading(false);
    window.requestAnimationFrame(() => {
      triggerButtonRef.current?.focus();
    });
  }, []);

  const clearQueryOnly = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setError(null);
    inputRef.current?.focus();
  }, []);

  // Global keyboard shortcuts: "/" or Ctrl+K / Cmd+K to open; Esc to close & clear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTypingField =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
        return;
      }

      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !isTypingField) {
        e.preventDefault();
        openSearch();
        return;
      }

      if (e.key === 'Escape' && isExpanded) {
        e.preventDefault();
        closeAndClearSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, openSearch, closeAndClearSearch]);

  // Execute Supabase search when debounced query or filter chips change
  useEffect(() => {
    if (!isExpanded || !hasActiveCriteria) {
      abortControllerRef.current?.abort();
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
      setResults([]);
      setLoading(false);
      setError('Sign in to search your resources.');
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentRequestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);

    DBService.searchUserFiles({
      userId,
      query: debouncedQuery,
      fileType: selectedFileType,
      courseCode: selectedCourseCode,
      signal: controller.signal,
    })
      .then((data) => {
        if (currentRequestId !== requestIdRef.current) return;
        setResults(data);
        setLoading(false);
      })
      .catch((err: any) => {
        if (controller.signal.aborted || err?.name === 'AbortError') return;
        if (currentRequestId !== requestIdRef.current) return;
        console.error('ResourceSearch error:', err);
        setError('Could not search resources. Please try again.');
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [isExpanded, hasActiveCriteria, debouncedQuery, selectedFileType, selectedCourseCode, retryCounter]);

  const handleOpenResult = (file: UserFile) => {
    if (onOpenFile) {
      onOpenFile(file);
      return;
    }
    const safeUrl = toSafeExternalUrl(file.downloadUrl);
    if (safeUrl) {
      window.open(safeUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (!isExpanded) {
    return (
      <button
        ref={triggerButtonRef}
        type="button"
        onClick={openSearch}
        aria-label="Search resources"
        aria-expanded={false}
        title="Search resources (/ or Ctrl+K)"
        className={`inline-flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 hover:border-[#2563EB] hover:bg-[#EFF6FF] dark:hover:bg-slate-800 text-[#111827] dark:text-slate-200 rounded-lg min-h-[44px] min-w-[44px] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 ${className}`}
      >
        <Search size={18} className="text-[#5B6472] dark:text-slate-300" aria-hidden="true" />
        <span className="hidden sm:inline text-xs font-medium text-[#5B6472] dark:text-slate-300">
          Search
        </span>
        <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-[#5B6472] dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded">
          /
        </kbd>
      </button>
    );
  }

  return (
    <div
      role="search"
      aria-label="Search resources"
      className={`w-full space-y-3 ${className}`}
    >
      {/* Expanded Search Input Row */}
      <div className="flex items-center gap-2 w-full">
        <div className="relative flex-1 min-w-0">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B6472] dark:text-slate-400 pointer-events-none"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label="Search resources by title or course code"
            className="w-full pl-10 pr-11 py-2.5 bg-white dark:bg-slate-900 border border-[#2563EB] dark:border-blue-500 rounded-lg text-sm text-[#111827] dark:text-white placeholder-[#5B6472] dark:placeholder-slate-400 min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-1 [&::-webkit-search-cancel-button]:hidden"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={clearQueryOnly}
              aria-label="Clear search"
              className="absolute right-0.5 top-1/2 -translate-y-1/2 p-2 text-[#5B6472] hover:text-[#111827] dark:text-slate-400 dark:hover:text-white rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={closeAndClearSearch}
          aria-label="Close search"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[#111827] dark:text-slate-200 rounded-lg text-xs font-medium min-h-[44px] min-w-[44px] shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
        >
          <X size={16} className="sm:hidden" aria-hidden="true" />
          <span className="hidden sm:inline">Close</span>
        </button>
      </div>

      {/* Filter Chips: File Type (PDF, PPT, DOCX) & Course (from existing columns) */}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter search results">
        {FILE_TYPE_OPTIONS.map((type) => {
          const active = selectedFileType === type;
          return (
            <button
              key={type}
              type="button"
              aria-pressed={active}
              onClick={() => setSelectedFileType(active ? null : type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium min-h-[44px] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-1 ${
                active
                  ? 'bg-[#2563EB] text-white border border-[#2563EB]'
                  : 'bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 text-[#5B6472] dark:text-slate-300 hover:border-[#2563EB] hover:text-[#2563EB]'
              }`}
            >
              {type}
            </button>
          );
        })}

        {uniqueCourseCodes.length > 0 && (
          <span className="h-4 w-px bg-[#E5E7EB] dark:bg-slate-800 mx-1 hidden sm:inline-block" aria-hidden="true" />
        )}

        {uniqueCourseCodes.map((code) => {
          const active = selectedCourseCode === code;
          return (
            <button
              key={code}
              type="button"
              aria-pressed={active}
              onClick={() => setSelectedCourseCode(active ? null : code)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium min-h-[44px] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-1 ${
                active
                  ? 'bg-[#111827] dark:bg-[#2563EB] text-white border border-[#111827] dark:border-[#2563EB]'
                  : 'bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 text-[#5B6472] dark:text-slate-300 hover:border-[#2563EB] hover:text-[#2563EB]'
              }`}
            >
              {code}
            </button>
          );
        })}
      </div>

      {/* Results Region */}
      {hasImmediateCriteria && (
        <div
          aria-live="polite"
          aria-busy={loading}
          className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg overflow-hidden"
        >
          {loading ? (
            <div className="divide-y divide-[#E5E7EB] dark:divide-slate-800" aria-label="Loading search results">
              {[0, 1, 2].map((i) => (
                <div key={i} className="p-3.5 flex items-center justify-between gap-3 animate-pulse">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                      <div className="h-2.5 bg-slate-100 dark:bg-slate-800/70 rounded w-1/3" />
                    </div>
                  </div>
                  <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg shrink-0" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                <AlertCircle size={16} aria-hidden="true" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setRetryCounter((c) => c + 1)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#2563EB] hover:bg-[#1746A2] text-white text-xs font-medium rounded-lg min-h-[44px] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
              >
                <RotateCcw size={14} aria-hidden="true" />
                <span>Retry</span>
              </button>
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center space-y-1">
              <p className="text-sm font-medium text-[#111827] dark:text-white">
                {debouncedQuery.trim()
                  ? `No results for '${debouncedQuery.trim()}'`
                  : 'No matching resources found'}
              </p>
              <p className="text-xs text-[#5B6472] dark:text-slate-400">
                Try a different keyword or clear one of the active filters.
              </p>
            </div>
          ) : (
            <div>
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-[#E5E7EB] dark:border-slate-800 flex items-center justify-between text-[11px] font-medium text-[#5B6472] dark:text-slate-400">
                <span>
                  {results.length} {results.length === 1 ? 'result' : 'results'}
                  {results.length === 30 ? ' (showing top 30)' : ''}
                </span>
                <span>Esc to close</span>
              </div>
              <ul className="divide-y divide-[#E5E7EB] dark:divide-slate-800 max-h-[360px] overflow-y-auto">
                {results.map((file) => (
                  <li
                    key={file.id}
                    className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {getResourceFileIcon(file)}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-[#111827] dark:text-white truncate">
                          <HighlightedText text={file.fileName} query={debouncedQuery} />
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#5B6472] dark:text-slate-400 mt-0.5">
                          {file.courseCode && (
                            <span className="px-1.5 py-0.5 bg-[#EFF6FF] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 rounded font-mono font-semibold">
                              <HighlightedText text={file.courseCode} query={debouncedQuery} />
                            </span>
                          )}
                          <span>{file.fileSize || '—'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {(onOpenFile || file.downloadUrl) && (
                        <button
                          type="button"
                          onClick={() => handleOpenResult(file)}
                          aria-label={`${openActionLabel} ${file.fileName}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#EFF6FF] hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-[#2563EB] dark:text-blue-300 rounded-lg text-xs font-medium min-h-[44px] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                        >
                          <span>{openActionLabel}</span>
                          <ArrowUpRight size={13} aria-hidden="true" />
                        </button>
                      )}
                      {toSafeExternalUrl(file.downloadUrl) && (
                        <a
                          href={toSafeExternalUrl(file.downloadUrl)!}
                          download={file.fileName}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Download ${file.fileName}`}
                          title={`Download ${file.fileName}`}
                          className="p-2 text-[#5B6472] hover:text-[#111827] dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                        >
                          <Download size={15} aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResourceSearch;
