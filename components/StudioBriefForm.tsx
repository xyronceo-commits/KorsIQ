import React, { useState, useRef, useEffect } from 'react';
import { Upload, Loader2, FileText, ArrowRight, ArrowLeft } from 'lucide-react';
import {
  AcademicDocumentType,
  CitationStyle,
  Course,
  DocumentTemplateId,
  SlideTemplateId,
  StudioBrief,
  StudioFileFormat,
  StudioLengthUnit,
  StudioWeeklyQuota,
  UserFile,
  UserProfile,
} from '../types';
import { NIGERIAN_UNIVERSITIES } from '../utils/nigerianUniversities';
import { GeminiService } from '../services/gemini';
import { formatQuotaResetLabel, STUDIO_V2_LIMITS } from '../lib/studioV2';
import {
  DEFAULT_SLIDE_TEMPLATE_ID,
  documentTemplateToLegacyStyle,
  resolveDocumentTemplate,
  resolveSlideTemplate,
} from '../lib/studioTemplates';
import { StudioTemplatePicker } from './StudioTemplatePicker';

interface StudioBriefFormProps {
  profile: UserProfile;
  courses: Course[];
  userFiles: UserFile[];
  initialBrief?: Partial<StudioBrief>;
  isSubmitting: boolean;
  weeklyQuota?: StudioWeeklyQuota | null;
  onCancel: () => void;
  onSubmit: (brief: StudioBrief) => void | Promise<void>;
}

const DOC_TYPES: Array<{ id: AcademicDocumentType; label: string; defaultLength: number; unit: StudioLengthUnit }> = [
  { id: 'assignment', label: 'Assignment', defaultLength: 1500, unit: 'words' },
  { id: 'report', label: 'Report', defaultLength: 2500, unit: 'words' },
  { id: 'project', label: 'Project / Dissertation', defaultLength: 6000, unit: 'words' },
  { id: 'term_paper', label: 'Term Paper', defaultLength: 3000, unit: 'words' },
  { id: 'seminar_paper', label: 'Seminar Paper', defaultLength: 2500, unit: 'words' },
  { id: 'lab_report', label: 'Lab Report', defaultLength: 1800, unit: 'words' },
  { id: 'proposal', label: 'Proposal', defaultLength: 2500, unit: 'words' },
  { id: 'presentation', label: 'Presentation', defaultLength: 12, unit: 'slides' },
];

const CITATION_STYLES: CitationStyle[] = ['APA 7', 'Harvard', 'MLA', 'IEEE', 'Chicago', 'Vancouver'];

export const StudioBriefForm: React.FC<StudioBriefFormProps> = ({
  profile,
  courses,
  userFiles,
  initialBrief,
  isSubmitting,
  weeklyQuota,
  onCancel,
  onSubmit,
}) => {
  const firstCourse = courses[0];
  const [title, setTitle] = useState(initialBrief?.title || '');
  const [docType, setDocType] = useState<AcademicDocumentType>(initialBrief?.docType || 'assignment');
  const [courseCode, setCourseCode] = useState(initialBrief?.courseCode || firstCourse?.code || '');
  const [courseTitle, setCourseTitle] = useState(initialBrief?.courseTitle || firstCourse?.title || '');
  const [supervisorName, setSupervisorName] = useState(initialBrief?.supervisorName || '');
  const [studentName, setStudentName] = useState(initialBrief?.studentName || profile.name || '');
  const [matricNumber, setMatricNumber] = useState(initialBrief?.matricNumber || '');
  const [department, setDepartment] = useState(initialBrief?.department || profile.department || '');
  const [faculty, setFaculty] = useState(initialBrief?.faculty || '');
  const [institution, setInstitution] = useState(initialBrief?.institution || profile.university || '');
  const [date, setDate] = useState(
    initialBrief?.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  );
  const [instructions, setInstructions] = useState(initialBrief?.instructions || '');
  const [citationStyle, setCitationStyle] = useState<CitationStyle>(initialBrief?.citationStyle || 'APA 7');
  const [targetLength, setTargetLength] = useState<number>(initialBrief?.targetLength || 1500);
  const [lengthUnit, setLengthUnit] = useState<StudioLengthUnit>(initialBrief?.lengthUnit || 'words');
  const initialDocTemplate = resolveDocumentTemplate(
    initialBrief?.documentTemplateId,
    initialBrief?.documentPaletteId,
    initialBrief?.documentStyle
  );
  const initialSlideTemplate = resolveSlideTemplate(
    initialBrief?.slideTemplateId || DEFAULT_SLIDE_TEMPLATE_ID,
    initialBrief?.slidePaletteId
  );
  const [documentTemplateId, setDocumentTemplateId] = useState<DocumentTemplateId>(
    initialDocTemplate.id
  );
  const [documentPaletteId, setDocumentPaletteId] = useState<string>(
    initialDocTemplate.activePaletteId
  );
  const [slideTemplateId, setSlideTemplateId] = useState<SlideTemplateId>(
    initialSlideTemplate.id
  );
  const [slidePaletteId, setSlidePaletteId] = useState<string>(
    initialSlideTemplate.activePaletteId
  );
  const [spacing, setSpacing] = useState<'1.5' | 'double'>(initialBrief?.spacing || '1.5');
  const [visualsEnabled, setVisualsEnabled] = useState<boolean>(initialBrief?.visualsEnabled ?? false);
  const [fileFormat, setFileFormat] = useState<StudioFileFormat>(initialBrief?.fileFormat || 'docx');
  const [pastedReferences, setPastedReferences] = useState(initialBrief?.pastedReferences || '');
  const [uploadedMaterialIds, setUploadedMaterialIds] = useState<string[]>(initialBrief?.uploadedMaterialIds || []);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [localSubmitting, setLocalSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const errorBannerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isSubmitting) {
      submittingRef.current = false;
      setLocalSubmitting(false);
    }
  }, [isSubmitting]);

  const effectiveSubmitting = isSubmitting || localSubmitting;
  const isSlideMode = fileFormat === 'pptx' || docType === 'presentation';

  const handleLengthUnitChange = (nextUnit: StudioLengthUnit) => {
    setLengthUnit(nextUnit);
    if (nextUnit === 'pages' && targetLength > 100) {
      setTargetLength(10);
    } else if (nextUnit === 'slides' && targetLength > 100) {
      setTargetLength(12);
    } else if (nextUnit === 'words' && targetLength < 100) {
      setTargetLength(1500);
    }
  };

  const handleDocTypeChange = (nextType: AcademicDocumentType) => {
    setDocType(nextType);
    const cfg = DOC_TYPES.find((d) => d.id === nextType);
    if (cfg) {
      setTargetLength(cfg.defaultLength);
      setLengthUnit(cfg.unit);
      if (nextType === 'presentation') {
        setFileFormat('pptx');
      } else if (fileFormat === 'pptx') {
        setFileFormat('docx');
      }
    }
  };

  const handleFormatChange = (fmt: StudioFileFormat) => {
    setFileFormat(fmt);
    if (fmt === 'pptx') {
      setLengthUnit('slides');
      if (targetLength > 50) setTargetLength(12);
    } else if (lengthUnit === 'slides') {
      setLengthUnit('words');
      setTargetLength(1500);
    }
  };

  const handleCoursePick = (courseId: string) => {
    const found = courses.find((c) => c.id === courseId);
    if (found) {
      setCourseCode(found.code);
      setCourseTitle(found.title);
    }
  };

  const handleInstructionFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsReadingFile(true);
    setErrorMsg(null);
    try {
      const reader = new FileReader();
      const base64: string = await new Promise((resolve, reject) => {
        reader.onload = () => {
          const res = String(reader.result || '');
          resolve(res.includes(',') ? res.split(',')[1] : res);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const res = await GeminiService.extractFileText(file.name, file.type, base64);
      if (res.success && res.extractedText) {
        setInstructions((prev) => (prev ? `${prev}\n\n${res.extractedText}` : res.extractedText));
      } else {
        setErrorMsg(res.error || 'Could not read text from the uploaded file.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not read file.');
    } finally {
      setIsReadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleMaterialId = (id: string) => {
    setUploadedMaterialIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const submitBrief = async () => {
    if (submittingRef.current || isSubmitting) return;
    if (!title.trim()) {
      setErrorMsg('Please enter a document title.');
      titleInputRef.current?.focus();
      errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const maxAllowed = lengthUnit === 'words' ? STUDIO_V2_LIMITS.maxTargetWords : 100;
    const normalizedTarget = Math.min(maxAllowed, Math.max(1, Number(targetLength) || 1));
    if (lengthUnit === 'words' && targetLength > STUDIO_V2_LIMITS.maxTargetWords) {
      setErrorMsg(`Target length cannot exceed ${STUDIO_V2_LIMITS.maxTargetWords.toLocaleString()} words.`);
      errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setErrorMsg(null);
    submittingRef.current = true;
    setLocalSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        docType,
        courseCode: courseCode.trim(),
        courseTitle: courseTitle.trim(),
        supervisorName: supervisorName.trim(),
        studentName: studentName.trim(),
        matricNumber: matricNumber.trim(),
        department: department.trim(),
        faculty: faculty.trim(),
        institution: institution.trim(),
        date: date.trim(),
        instructions: instructions.trim(),
        citationStyle,
        targetLength: normalizedTarget,
        lengthUnit,
        documentStyle: documentTemplateToLegacyStyle(documentTemplateId),
        documentTemplateId,
        documentPaletteId,
        slideTemplateId,
        slidePaletteId,
        spacing,
        visualsEnabled,
        fileFormat,
        pastedReferences: pastedReferences.trim() || undefined,
        uploadedMaterialIds,
      });
    } finally {
      submittingRef.current = false;
      setLocalSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitBrief();
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] dark:border-slate-800 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#111827] dark:text-white">
              New Document Brief
            </h1>
            {weeklyQuota?.isBetaLimited && typeof weeklyQuota.limit === 'number' && typeof weeklyQuota.remaining === 'number' && (
              <span
                data-studio-weekly-quota-pill="true"
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                  weeklyQuota.remaining === 0
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800'
                    : 'bg-[#EFF6FF] dark:bg-blue-950/50 text-[#1746A2] dark:text-blue-200 border-blue-200/70 dark:border-blue-900'
                }`}
              >
                {weeklyQuota.remaining === 0
                  ? `0 of ${weeklyQuota.limit} left · ${formatQuotaResetLabel(weeklyQuota.resetAt)}`
                  : `${weeklyQuota.remaining} of ${weeklyQuota.limit} weekly generations left`}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#5B6472] dark:text-slate-400 mt-0.5">
            Fill in your brief once. You will review the outline before anything is written.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-xs font-medium text-[#111827] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[44px] cursor-pointer"
        >
          <ArrowLeft size={15} />
          <span>Back</span>
        </button>
      </div>

      {errorMsg && (
        <div
          ref={errorBannerRef}
          role="alert"
          className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium"
        >
          {errorMsg}
        </div>
      )}

      {/* 1. Core Details & File Format */}
      <section className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#111827] dark:text-white">Document & Format</h2>

        <div>
          <label className="block text-xs font-medium text-[#111827] dark:text-slate-200 mb-1">
            Title or Topic *
          </label>
          <input
            ref={titleInputRef}
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Impact of Mobile Banking on Small Businesses in Lagos"
            className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-sm text-[#111827] dark:text-white min-h-[44px]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#111827] dark:text-slate-200 mb-1">
              Document Type
            </label>
            <select
              value={docType}
              onChange={(e) => handleDocTypeChange(e.target.value as AcademicDocumentType)}
              className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-sm text-[#111827] dark:text-white min-h-[44px]"
            >
              {DOC_TYPES.map((dt) => (
                <option key={dt.id} value={dt.id}>
                  {dt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#111827] dark:text-slate-200 mb-1">
              File Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['docx', 'pdf', 'pptx'] as StudioFileFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => handleFormatChange(fmt)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold uppercase border min-h-[44px] cursor-pointer transition-colors ${
                    fileFormat === fmt
                      ? 'bg-[#2563EB] text-white border-[#2563EB]'
                      : 'bg-white dark:bg-slate-800 text-[#111827] dark:text-slate-200 border-[#E5E7EB] dark:border-slate-700 hover:border-[#2563EB]'
                  }`}
                >
                  .{fmt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Course & Cover Page Metadata */}
      <section className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#111827] dark:text-white">Course & Cover Details</h2>

        {courses.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-[#5B6472] dark:text-slate-400 mb-1">
              Pick from your courses
            </label>
            <select
              onChange={(e) => handleCoursePick(e.target.value)}
              defaultValue={firstCourse?.id || ''}
              className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-sm text-[#111827] dark:text-white min-h-[44px]"
            >
              <option value="">Select a course...</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#111827] dark:text-slate-200 mb-1">Course Code</label>
            <input
              type="text"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              placeholder="e.g. CSC 301"
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-sm min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#111827] dark:text-slate-200 mb-1">Course Title</label>
            <input
              type="text"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              placeholder="e.g. Data Structures"
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-sm min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#111827] dark:text-slate-200 mb-1">Student Name</label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-sm min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#111827] dark:text-slate-200 mb-1">Matric Number</label>
            <input
              type="text"
              value={matricNumber}
              onChange={(e) => setMatricNumber(e.target.value)}
              placeholder="e.g. 21/0452"
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-sm min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#111827] dark:text-slate-200 mb-1">Supervisor / Lecturer</label>
            <input
              type="text"
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
              placeholder="e.g. Dr. A. Ibrahim"
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-sm min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#111827] dark:text-slate-200 mb-1">Date</label>
            <input
              type="text"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-sm min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#111827] dark:text-slate-200 mb-1">Department</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-sm min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#111827] dark:text-slate-200 mb-1">Faculty</label>
            <input
              type="text"
              value={faculty}
              onChange={(e) => setFaculty(e.target.value)}
              placeholder="e.g. Faculty of Science"
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-sm min-h-[44px]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#111827] dark:text-slate-200 mb-1">Institution</label>
          <input
            type="text"
            list="studio-institutions-list"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="Select or type your institution"
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-sm min-h-[44px]"
          />
          <datalist id="studio-institutions-list">
            {NIGERIAN_UNIVERSITIES.map((uni) => (
              <option key={uni.name} value={uni.name} />
            ))}
          </datalist>
        </div>
      </section>

      {/* 3. Assignment Question / Instructions */}
      <section className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[#111827] dark:text-white">
            Question or Instructions
          </h2>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleInstructionFileUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isReadingFile}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-xs font-medium text-[#2563EB] hover:bg-[#EFF6FF] min-h-[44px] cursor-pointer"
          >
            {isReadingFile ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            <span>{isReadingFile ? 'Reading...' : 'Upload question file'}</span>
          </button>
        </div>
        <textarea
          rows={4}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Paste the assignment question, rubric, or specific points to cover..."
          className="w-full p-3 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-sm text-[#111827] dark:text-white"
        />
      </section>

      {/* 4. Length, Citation, Style & Visuals */}
      <section className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#111827] dark:text-white">Style & Citations</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#111827] dark:text-slate-200 mb-1">Citation Style</label>
            <select
              value={citationStyle}
              onChange={(e) => setCitationStyle(e.target.value as CitationStyle)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-sm min-h-[44px]"
            >
              {CITATION_STYLES.map((cs) => (
                <option key={cs} value={cs}>
                  {cs}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#111827] dark:text-slate-200 mb-1">Target Length</label>
            <input
              type="number"
              min={1}
              max={lengthUnit === 'words' ? STUDIO_V2_LIMITS.maxTargetWords : 100}
              value={targetLength}
              onChange={(e) => setTargetLength(Math.max(1, Number(e.target.value) || 1))}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-sm min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#111827] dark:text-slate-200 mb-1">Length Unit</label>
            <select
              value={lengthUnit}
              onChange={(e) => handleLengthUnitChange(e.target.value as StudioLengthUnit)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-sm min-h-[44px]"
            >
              <option value="words">Words (max {STUDIO_V2_LIMITS.maxTargetWords.toLocaleString()})</option>
              <option value="pages">Pages</option>
              <option value="slides">Slides</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!isSlideMode && (
            <div>
              <label className="block text-xs font-medium text-[#111827] dark:text-slate-200 mb-1">Line Spacing</label>
              <select
                value={spacing}
                onChange={(e) => setSpacing(e.target.value as '1.5' | 'double')}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-sm min-h-[44px]"
              >
                <option value="1.5">Template default / 1.5 spacing</option>
                <option value="double">Double spacing (2.0)</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#111827] dark:text-slate-200 mb-1">Visuals</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisualsEnabled(false)}
                className={`py-2 px-3 rounded-lg text-xs font-medium border min-h-[44px] cursor-pointer ${
                  !visualsEnabled
                    ? 'bg-[#111827] text-white border-[#111827]'
                    : 'bg-white dark:bg-slate-800 border-[#E5E7EB] dark:border-slate-700 text-[#5B6472]'
                }`}
              >
                Off
              </button>
              <button
                type="button"
                onClick={() => setVisualsEnabled(true)}
                className={`py-2 px-3 rounded-lg text-xs font-medium border min-h-[44px] cursor-pointer ${
                  visualsEnabled
                    ? 'bg-[#2563EB] text-white border-[#2563EB]'
                    : 'bg-white dark:bg-slate-800 border-[#E5E7EB] dark:border-slate-700 text-[#5B6472]'
                }`}
              >
                On (Charts/Diagrams)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4B. Pre-Generation Visual Template Picker (0 credits) */}
      <section className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg p-5">
        <StudioTemplatePicker
          mode={isSlideMode ? 'slide' : 'document'}
          selectedDocumentTemplateId={documentTemplateId}
          selectedDocumentPaletteId={documentPaletteId}
          selectedSlideTemplateId={slideTemplateId}
          selectedSlidePaletteId={slidePaletteId}
          onSelectDocumentTemplate={(id) => {
            setDocumentTemplateId(id);
            setDocumentPaletteId(resolveDocumentTemplate(id).activePaletteId);
          }}
          onSelectDocumentPalette={setDocumentPaletteId}
          onSelectSlideTemplate={(id) => {
            setSlideTemplateId(id);
            setSlidePaletteId(resolveSlideTemplate(id).activePaletteId);
          }}
          onSelectSlidePalette={setSlidePaletteId}
          sample={{
            title,
            courseCode,
            courseTitle,
            studentName,
            institution,
            date,
          }}
        />
      </section>

      {/* 5. Optional Sources */}
      <section className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-[#111827] dark:text-white">Sources (Optional)</h2>
          <p className="text-xs text-[#5B6472] dark:text-slate-400 mt-0.5">
            Paste references, DOIs, or links, or select your uploaded materials. You can skip this and let KorsIQ retrieve verifiable academic works.
          </p>
        </div>

        <textarea
          rows={3}
          value={pastedReferences}
          onChange={(e) => setPastedReferences(e.target.value)}
          placeholder="One reference, DOI (e.g. 10.1038/...), or URL per line..."
          className="w-full p-3 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-sm text-[#111827] dark:text-white"
        />

        {userFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-[#111827] dark:text-slate-200">
              Your uploaded materials
            </p>
            <div className="max-h-40 overflow-y-auto divide-y divide-[#E5E7EB] dark:divide-slate-800 border border-[#E5E7EB] dark:border-slate-800 rounded-lg">
              {userFiles.slice(0, 15).map((f) => {
                const checked = uploadedMaterialIds.includes(f.id);
                return (
                  <label
                    key={f.id}
                    className="flex items-center gap-3 px-3 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer min-h-[44px]"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMaterialId(f.id)}
                      className="rounded border-[#E5E7EB] text-[#2563EB]"
                    />
                    <FileText size={14} className="text-[#2563EB] shrink-0" />
                    <span className="truncate flex-1 font-medium text-[#111827] dark:text-white">
                      {f.fileName}
                    </span>
                    {f.courseCode && (
                      <span className="text-[11px] font-mono text-[#5B6472]">{f.courseCode}</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-sm font-medium text-[#111827] dark:text-slate-200 min-h-[44px] cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          data-draft-outline-btn="true"
          disabled={effectiveSubmitting}
          onMouseDown={(e) => {
            // Prevent blur-induced layout shifts (e.g. datalist/keyboard collapse) from swallowing the first click
            e.preventDefault();
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1746A2] disabled:opacity-60 text-white rounded-lg text-sm font-semibold min-h-[44px] cursor-pointer"
        >
          {effectiveSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
          <span>{effectiveSubmitting ? 'Drafting outline...' : 'Draft Outline'}</span>
          {!effectiveSubmitting && <ArrowRight size={16} />}
        </button>
      </div>
    </form>
  );
};

export default StudioBriefForm;
