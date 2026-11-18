'use client';
import { SYLLABUS_MIME, syllabusKindFromName } from '@/lib/syllabus-files';
import { T, useT } from '@/components/language-provider';
import { formatPercent } from '@/lib/i18n/format';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FileText, LoaderCircle, Plus, Upload } from 'lucide-react';
import { useWorkspace } from './workspace-provider';
import { AiAgeConfirm, useAiAgeRequired } from './ai-age-confirm';
import { Button } from './ui/button';
import { SyllabusSessions, SyllabusSessionDate, type SessionGroups } from './syllabus-sessions';
import {
  sessionDateChoices,
  sessionGroup,
  type SyllabusSession,
  type SyllabusException,
  type SessionKind,
  type SessionDateChoice,
} from '@/lib/syllabus-schedule';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { type SyllabusSuggestion } from '@/lib/syllabus';
import type { SyllabusPreview, SyllabusCategory } from '@/lib/syllabus-result';
import { dateKey, toDateTimeLocal } from '@/lib/dates';
import type { AssessmentType, Course } from '@/lib/types';
import { matchingCourses } from '@/lib/course-matching';
import { reconcileSyllabusPreview } from '@/lib/syllabus-matching';
import { SyllabusCategoryWeights } from './syllabus-category-weights';
import { GradingRulesEditor } from './grading-rules-editor';
import { SyllabusBestOfSuggestion, bestOfRuleName } from './syllabus-best-of-suggestion';
import {
  detectSyllabusBestOfSuggestions,
  gradingRuleFromSyllabusSuggestion,
  type SyllabusBestOfSuggestion as BestOfSuggestion,
} from '@/lib/syllabus-grading-rules';
import {
  configuredCourseWeight,
  gradingRuleError,
  resolveGradingRules,
  type GradingRule,
} from '@/lib/grading-rules';

type Row = SyllabusSuggestion & {
  id: number;
  selected: boolean;
  existingId: string;
  weightText: string;
  chosenSession?: SessionDateChoice | null;
  alreadyDone?: boolean;
};
// Work more than a week past defaults to "already done" so a mid-semester import is not full of
// overdue items; anything more recent stays open in case the student is still submitting late.
const RECENT_MS = 7 * 24 * 60 * 60 * 1000;
const dueTime = (row: { date: string; time: string }) =>
  row.date ? new Date(`${row.date}T${row.time || '23:59'}:00`).getTime() : NaN;
const isPastDue = (row: { date: string; time: string }) => dueTime(row) < Date.now();
const markedDone = (row: Row) =>
  isPastDue(row) && (row.alreadyDone ?? Date.now() - dueTime(row) > RECENT_MS);
const types: AssessmentType[] = [
  'ASSIGNMENT',
  'LAB',
  'QUIZ',
  'MIDTERM',
  'FINAL_EXAM',
  'PROJECT',
  'OTHER',
];

export function SyllabusImport({ initialCourseId }: { initialCourseId?: string }) {
  const t = useT();
  const { data, refresh, openEditor } = useWorkspace();
  const ageRequired = useAiAgeRequired();
  const uploadLimitMB = data.hosted ? 4 : 8;
  const [courseId, setCourseId] = useState(initialCourseId || '');
  const [mode, setMode] = useState<'new' | 'existing'>(initialCourseId ? 'existing' : 'new');
  const [termId, setTermId] = useState(
    () =>
      data.courses.find((c) => c.id === initialCourseId)?.semesterId ||
      data.semesters.find((s) => s.isActive)?.id ||
      data.semesters[0]?.id ||
      '',
  );
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseEvidence, setCourseEvidence] = useState('');
  const [savedCourseId, setSavedCourseId] = useState('');
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileName = selectedFile?.name || '';
  const [rows, setRows] = useState<Row[] | null>(null);
  const [categories, setCategories] = useState<SyllabusCategory[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [gradingRules, setGradingRules] = useState<GradingRule[]>([]);
  const [gradingNotes, setGradingNotes] = useState('');
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
  const [sessions, setSessions] = useState<SyllabusSession[]>([]);
  const [exceptions, setExceptions] = useState<SyllabusException[]>([]);
  const [sessionNotice, setSessionNotice] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const reading = busy && rows === null;
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [statusAttempt, setStatusAttempt] = useState(0);
  const pendingRead = useRef<AbortController | null>(null);
  const nextId = useRef(0);
  const lastPreview = useRef<SyllabusPreview | null>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/syllabus/preview', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const status = await response.json();
        setConfigured(status.configured === true);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setConfigured(false);
          setError('Could not reach the syllabus reader. Check your connection and try again.');
        }
      });
    return () => {
      controller.abort();
      pendingRead.current?.abort();
    };
  }, [statusAttempt]);
  const course =
    mode === 'existing'
      ? data.courses.find(
          (item) => item.id === courseId && item.semesterId === termId && !item.archived,
        )
      : undefined;
  const semester = data.semesters.find((item) => item.id === termId);
  const canRead = Boolean(semester && (mode === 'new' || course));
  const existing =
    mode === 'existing' ? data.assessments.filter((item) => item.courseId === course?.id) : [];
  const duplicateCourses =
    mode === 'new' ? matchingCourses(data.courses, data.semesters, courseCode, termId) : [];
  const deletedMatches =
    mode === 'new'
      ? matchingCourses(data.deletedCourses || [], data.semesters, courseCode, termId)
      : [];
  const duplicateCourse = duplicateCourses.length > 0 || deletedMatches.length > 0;
  const selected = rows?.filter((row) => row.selected) || [];
  const ruleAssessments = [
    ...existing.filter((a) => !selected.some((r) => r.existingId === a.id)),
    ...selected.map((row) => ({
      id: row.existingId || `import:${row.id}`,
      name: row.name,
      type: row.type,
      weight:
        row.weightText === ''
          ? (existing.find((a) => a.id === row.existingId)?.weight ?? 0)
          : Number(row.weightText),
    })),
  ];
  const total = configuredCourseWeight(ruleAssessments, gradingRules);
  const ruleError = gradingRuleError(gradingRules, ruleAssessments);
  const bestOfSuggestions = rows
    ? detectSyllabusBestOfSuggestions({
        categories,
        items: selected,
        warnings,
        assessments: ruleAssessments,
        rules: gradingRules,
      }).filter((s) => !dismissedSuggestions.includes(s.key))
    : [];

  function clearReview() {
    setRows(null);
    setCategories([]);
    setGradingRules([]);
    setGradingNotes('');
    setDismissedSuggestions([]);
    setSessions([]);
    setExceptions([]);
    setSessionNotice('');
    setReviewed(false);
    setNotice('');
    setError('');
  }
  function update(id: number, patch: Partial<Row>) {
    setRows(
      (current) => current?.map((row) => (row.id === id ? { ...row, ...patch } : row)) ?? null,
    );
    setReviewed(false);
    setError('');
  }
  const reviewCourseCode = mode === 'existing' ? course?.code || '' : courseCode;
  function clearSessionDates(kind?: SessionKind) {
    setRows(
      (current) =>
        current?.map((row) =>
          row.chosenSession && (!kind || row.timing?.kind === kind)
            ? { ...row, date: '', time: '', chosenSession: null }
            : row,
        ) ?? null,
    );
    setSessionNotice('');
    setReviewed(false);
  }
  function confirmSessions(groups: SessionGroups) {
    let count = 0;
    const updated =
      rows?.map((row) => {
        if (!row.timing?.kind || (row.date && !row.chosenSession)) return row;
        const group = groups[row.timing.kind];
        if (!group) return row;
        const choices = sessionDateChoices(
          row.timing,
          sessions,
          reviewCourseCode,
          exceptions,
        ).filter((choice) => sessionGroup(choice.session) === group);
        if (choices.length !== 1 || choices[0].conflicts.length) return row;
        const choice = choices[0];
        count++;
        return { ...row, date: choice.date, time: choice.time, chosenSession: choice };
      }) ?? null;
    setRows(updated);
    setReviewed(false);
    setSessionNotice(String(count));
  }
  function sourceNotes(row: Row) {
    return [
      row.page ? 'Source page ' + row.page : '',
      row.source.slice(0, 900),
      row.timing
        ? 'Schedule: ' +
          row.timing.label +
          ' (' +
          (row.timing.startDate || '?') +
          ' to ' +
          (row.timing.endDate || '?') +
          '). ' +
          row.timing.source.slice(0, 400)
        : '',
      row.chosenSession
        ? 'Session confirmed by user: ' +
          row.chosenSession.session.section +
          '. Inferred date: ' +
          row.date +
          ' ' +
          row.time +
          '. ' +
          row.chosenSession.session.source.slice(0, 250)
        : '',
      row.tentative ? 'Tentative syllabus schedule; check course announcements.' : '',
      row.durationMinutes ? 'Duration: ' + row.durationMinutes + ' minutes.' : '',
      row.weight === null ? row.warnings.join(' ').slice(0, 250) : '',
    ]
      .filter(Boolean)
      .join('\n')
      .slice(0, 2000);
  }
  function selectFile(file?: File) {
    if (!file) return;
    clearReview();
    setSelectedFile(null);
    if (!syllabusKindFromName(file.name)) {
      setError(
        'Choose a PDF, DOCX, JPG, PNG or TXT file. For older .doc files, save as .docx or PDF.',
      );
      return;
    }
    if (file.size > uploadLimitMB * 1024 * 1024) {
      setError(`Choose a file smaller than ${uploadLimitMB} MB.`);
      return;
    }
    setText('');
    setSelectedFile(file);
  }
  function showSuggestions(result: SyllabusPreview, chosenCourse?: Course) {
    lastPreview.current = result;
    const matches =
      mode === 'new'
        ? matchingCourses(data.courses, data.semesters, result.course?.code || '', termId)
        : [];
    const target =
      chosenCourse ||
      course ||
      (matches.length === 1 && matches[0].semesterId === termId && !matches[0].archived
        ? matches[0]
        : undefined);
    if (target && mode === 'new') {
      setMode('existing');
      setCourseId(target.id);
      setTermId(target.semesterId);
      setNotice(
        'Matched your existing course. Review the updates below; a second course will not be created.',
      );
    }
    const targetAssessments = target
      ? data.assessments.filter((item) => item.courseId === target.id)
      : [];
    setGradingRules(target?.gradingRules || []);
    const reconciled = reconcileSyllabusPreview(result, targetAssessments);
    setCategories(reconciled.categories);
    setGradingNotes(target?.gradingNotes || '');
    setSessions(result.sessions || []);
    setExceptions(result.exceptions || []);
    setSessionNotice('');
    setCourseCode(result.course?.code || '');
    setCourseName(result.course?.name || '');
    setCourseEvidence(
      result.course?.source
        ? `${result.course.page ? `Page ${result.course.page}: ` : ''}${result.course.source}`
        : '',
    );
    setRows(
      reconciled.items.map((item) => ({
        ...item,
        id: nextId.current++,
        weightText: item.weight === null ? '' : String(item.weight),
      })),
    );
    setWarnings(reconciled.warnings);
    requestAnimationFrame(() => reviewHeading.current?.focus());
  }
  function applyCategory(category: SyllabusCategory) {
    const current = gradingRules.find(
      (r) => r.mode === 'equal' && r.assessmentType === category.type,
    );
    const rule: GradingRule = {
      id: current?.id || crypto.randomUUID(),
      name: category.name,
      mode: 'equal',
      assessmentType: category.type,
      keep: 1,
      weight: category.weight,
      assessmentIds: [],
      source: category.source,
    };
    setGradingRules([...gradingRules.filter((r) => r.id !== current?.id), rule]);
    setReviewed(false);
    setError('');
  }
  function applyBestOf(suggestion: BestOfSuggestion) {
    const rule = gradingRuleFromSyllabusSuggestion(
      suggestion,
      crypto.randomUUID(),
      t(bestOfRuleName(suggestion.type)),
    );
    if (!rule) return;
    setGradingRules([...gradingRules, rule]);
    setReviewed(false);
    setError('');
    setNotice('Rule added to this review. Save your changes to keep it.');
  }
  async function analyse(source: File | string) {
    if (pendingRead.current || !canRead || !configured) return;
    clearReview();
    const controller = new AbortController();
    pendingRead.current = controller;
    setBusy(true);
    try {
      const response = await fetch('/api/syllabus/preview', {
        method: 'POST',
        headers: {
          'Content-Type':
            typeof source === 'string'
              ? 'text/plain'
              : SYLLABUS_MIME[syllabusKindFromName(source.name)!],
          ...(mode === 'new' ? { 'X-Command-Semester': termId } : { 'X-Command-Course': courseId }),
        },
        body: source,
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The syllabus could not be read.');
      if (!controller.signal.aborted) showSuggestions(result);
    } catch (err) {
      if (!controller.signal.aborted)
        setError(err instanceof Error ? err.message : 'The syllabus could not be read.');
    } finally {
      pendingRead.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  async function extract(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    setSelectedFile(null);
    await analyse(text);
  }
  function matchRow(row: Row, id: string) {
    const match = existing.find((item) => item.id === id);
    update(row.id, { existingId: id, ...(match ? { name: match.name, type: match.type } : {}) });
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (ruleError) {
      setError(ruleError);
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/syllabus/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(mode === 'new'
            ? { newCourse: { semesterId: termId, code: courseCode, name: courseName } }
            : { courseId }),
          reviewed,
          gradingRules,
          gradingNotes,
          items: selected.map((row) => ({
            clientId: `import:${row.id}`,
            existingId: row.existingId || null,
            name: row.name,
            type: row.type,
            dueDate: row.date
              ? new Date(`${row.date}T${row.time || '23:59'}:00`).toISOString()
              : null,
            weight: row.weightText === '' ? null : Number(row.weightText),
            source: sourceNotes(row),
            alreadyDone: markedDone(row),
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The import could not be saved.');
      setRows(null);
      setReviewed(false);
      setText('');
      setSelectedFile(null);
      setSavedCourseId(result.courseId || courseId);
      setNotice(
        (result.courseCreated ? t('Course created.') + ' ' : '') +
          t('Saved: {created} new assessments and {updated} updated assessments.')
            .replace('{created}', String(result.created))
            .replace('{updated}', String(result.updated)),
      );
      try {
        await refresh();
      } catch {
        setNotice('Import saved. Refresh this page to see your updated assessments.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The import could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            <T text="FROM COURSE OUTLINE TO STUDY PLAN" />
          </p>
          <h1>
            <T text="Import syllabus" />
          </h1>
          <p>
            <T text="Find assessment dates and grade weights, then review them before saving." />
          </p>
        </div>
        <FileText aria-hidden size={28} className="text-primary" />
      </header>
      <p className="muted text-sm leading-relaxed">
        <T text="Upload a syllabus to create a course, or add assessments to one you already have. Review the course details, dates and weights before saving." />
      </p>
      <AiAgeConfirm />
      {configured === false && (
        <div role="status" className="card space-y-2 p-4">
          <p className="font-medium">
            <T text="Syllabus reading is currently unavailable" />
          </p>
          <p className="muted text-sm">
            <T text="Please try again later. There is nothing for you to set up. You can still add assessments manually and use your courses and grades." />
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setConfigured(null);
              setError('');
              setStatusAttempt((attempt) => attempt + 1);
            }}
          >
            <T text="Try again" />
          </Button>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-sm border border-[var(--danger)] p-4 text-sm text-[var(--danger)]"
        >
          {t(error)}
        </p>
      )}
      {notice && (
        <div role="status" className="card space-y-3 p-4">
          <p>{t(notice)}</p>
          {savedCourseId && (
            <Link className="text-primary underline" href={`/courses/${savedCourseId}`}>
              <T text="View course assessments" />
            </Link>
          )}
        </div>
      )}
      <form onSubmit={extract} className="card space-y-5 p-4 sm:p-5">
        <h2 className="section-title">
          <T text="1. Import your syllabus" />
        </h2>
        <fieldset disabled={busy} className="flex flex-wrap gap-3">
          <legend className="mb-2 text-sm font-medium">
            <T text="How would you like to import?" />
          </legend>
          {(['new', 'existing'] as const).map((value) => (
            <label
              key={value}
              className={`flex cursor-pointer items-center gap-2 rounded-sm border px-4 py-3 text-sm transition-colors hover:bg-[var(--muted)] ${mode === value ? 'border-[var(--primary)] text-primary' : 'border-[var(--border)]'}`}
            >
              <input
                type="radio"
                name="import-mode"
                value={value}
                checked={mode === value}
                onChange={() => {
                  setMode(value);
                  setCourseId('');
                  setSelectedFile(null);
                  clearReview();
                }}
              />
              {value === 'new' ? t('Create a course from syllabus') : t('Existing course')}
            </label>
          ))}
        </fieldset>
        <label className="block space-y-2 text-sm font-medium">
          <span>
            <T text="Term" />
          </span>
          <select
            className="input"
            required
            value={termId}
            disabled={busy}
            onChange={(e) => {
              setTermId(e.target.value);
              setCourseId('');
              setSelectedFile(null);
              clearReview();
            }}
          >
            <option value="">
              <T text="Choose a term" />
            </option>
            {data.semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.isActive ? t(' (active)') : ''} · {s.startDate.slice(0, 10)} –{' '}
                {s.endDate.slice(0, 10)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => openEditor('semesters')}
          >
            <Plus /> <T text="Add term" />
          </Button>
          <Link href="/settings/terms" className="text-sm text-primary underline">
            <T text="Manage terms" />
          </Link>
        </div>
        {mode === 'existing' && (
          <label className="block space-y-2 text-sm font-medium">
            <span>
              <T text="Course" />
            </span>
            <select
              className="input"
              required
              value={courseId}
              disabled={busy}
              onChange={(e) => {
                setCourseId(e.target.value);
                setSelectedFile(null);
                clearReview();
              }}
            >
              <option value="">
                <T text="Choose a course" />
              </option>
              {data.courses
                .filter((c) => !c.archived && c.semesterId === termId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name} ({data.semesters.find((s) => s.id === c.semesterId)?.name})
                  </option>
                ))}
            </select>
          </label>
        )}
        {semester && (
          <p className="muted text-xs">
            <T text="Dates without a year use" /> {semester.name}: {semester.startDate.slice(0, 10)}{' '}
            <T text="to" /> {semester.endDate.slice(0, 10)}.
          </p>
        )}
        <div className="space-y-2">
          <p className="text-sm font-medium">
            <T text="Upload syllabus (PDF, DOCX, JPG, PNG or TXT, up to" /> {uploadLimitMB}{' '}
            <T text="MB)" />
          </p>
          <p className="muted text-xs leading-relaxed" id="syllabus-ai-notice">
            <T text="Clicking Read syllabus or analysing pasted text sends it and the selected course name and term to Command’s reader and its configured AI provider (Google Gemini or OpenAI). No AI account or setup is needed. Command does not keep the original file; provider retention rules apply. Google’s free tier may use uploads to improve its products, so only upload non-sensitive syllabi." />{' '}
            <Link href="/guide#syllabus-privacy" className="underline">
              <T text="How your syllabus is handled" />
            </Link>
          </p>
          <input
            ref={fileInput}
            hidden
            type="file"
            aria-label={`Upload syllabus (PDF, DOCX, JPG, PNG or TXT, up to ${uploadLimitMB} MB)`}
            accept=".pdf,.docx,.jpg,.jpeg,.png,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,text/plain"
            disabled={busy}
            onChange={(e) => {
              selectFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className="syllabus-file-picker"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
            aria-labelledby="syllabus-file-action"
            aria-describedby="syllabus-file-status syllabus-file-help syllabus-ai-notice"
          >
            <span
              id="syllabus-file-action"
              className="flex items-center gap-2 text-sm font-semibold text-primary"
            >
              <Upload size={18} aria-hidden />
              <T text="Choose a file" />
            </span>
            <span
              id="syllabus-file-status"
              className="muted block break-all text-xs"
              aria-live="polite"
            >
              {fileName || t('No file chosen')}
            </span>
          </button>
          <Button
            type="button"
            disabled={busy || !configured || !canRead || !selectedFile || ageRequired}
            aria-busy={reading && Boolean(selectedFile)}
            onClick={() => {
              if (selectedFile) void analyse(selectedFile);
            }}
          >
            {reading && selectedFile ? (
              <>
                <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
                <T text="Reading…" />
              </>
            ) : (
              <>
                <FileText aria-hidden /> <T text="Read syllabus" />
              </>
            )}
          </Button>
          <p className="muted text-xs">
            <T text="Your file stays on this device until you click Read syllabus." />
          </p>
        </div>
        <p id="syllabus-file-help" className="muted text-xs">
          {configured === null
            ? t('Connecting to the reader… ')
            : !canRead
              ? t('Choose a term and, for an existing course, choose the course. ')
              : ''}
          <T text="PDFs up to 60 pages; Word (.docx) documents; JPG/PNG photos or screenshots; and TXT files. Choose one file, then click Read syllabus. Use clear images with the full page visible." />
        </p>
        {reading && (
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="flex items-start gap-4 rounded-sm border border-primary/40 bg-primary/10 p-4 sm:p-5"
          >
            <LoaderCircle
              aria-hidden
              className="mt-0.5 size-6 shrink-0 animate-spin text-primary motion-reduce:animate-none"
              style={{ animationDuration: '1.5s' }}
            />
            <div className="min-w-0 space-y-2 text-sm">
              <p className="font-semibold">
                <T text="Reading your syllabus…" />
              </p>
              <p className="muted">
                <T text="Reading your syllabus and checking dates and weights… This may take a minute or two." />
              </p>
              <p className="muted text-xs">
                <T text="If the provider is temporarily busy, Command retries automatically. Keep this page open." />
              </p>
            </div>
          </div>
        )}
        <details className="space-y-4">
          <summary className="cursor-pointer text-sm font-medium text-primary">
            <T text="Or paste syllabus text" />
          </summary>
          <label className="block space-y-2 text-sm font-medium">
            <span>
              <T text="Syllabus text" />
            </span>
            <Textarea
              rows={8}
              maxLength={100000}
              disabled={busy}
              value={text}
              placeholder={t(
                'Paste your syllabus, for example:\nMidterm 1 — October 20, 2026 at 14:00 — 25%\nAssignment 1 — November 2, 2026 at 23:59 — 10%',
              )}
              onChange={(e) => {
                setText(e.target.value);
                setSelectedFile(null);
                clearReview();
              }}
            />
          </label>
          <Button
            type="submit"
            aria-busy={reading && !selectedFile}
            disabled={busy || !configured || !canRead || !text.trim() || ageRequired}
          >
            {reading && !selectedFile ? (
              <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
            ) : (
              <Upload aria-hidden />
            )}
            {reading && !selectedFile ? t('Reading…') : t('Find assessments from text')}
          </Button>
        </details>
      </form>
      {rows !== null && (
        <form onSubmit={save} className="space-y-4">
          <div className="card space-y-3 p-4 sm:p-5">
            <h2 ref={reviewHeading} tabIndex={-1} className="section-title">
              <T text="2. Review suggestions" />
            </h2>
            {mode === 'new' && (
              <fieldset disabled={busy} className="space-y-4">
                <legend className="mb-3 text-sm font-semibold">
                  <T text="Your new course" />
                </legend>
                <p className="muted text-sm">
                  <T text="Check the course details found in your syllabus. Fill in any missing information." />
                </p>
                <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
                  <label className="space-y-2 text-sm">
                    <span>
                      <T text="Course code" />
                    </span>
                    <Input
                      required
                      maxLength={30}
                      value={courseCode}
                      onChange={(e) => {
                        setCourseCode(e.target.value);
                        clearSessionDates();
                      }}
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span>
                      <T text="Course name" />
                    </span>
                    <Input
                      required
                      maxLength={200}
                      value={courseName}
                      onChange={(e) => {
                        setCourseName(e.target.value);
                        setReviewed(false);
                      }}
                    />
                  </label>
                </div>
                {courseEvidence && <p className="muted text-xs">{courseEvidence}</p>}
                {duplicateCourse && (
                  <div className="rounded-sm border border-primary/40 bg-primary/5 p-4 space-y-3">
                    <p className="text-sm">
                      {t('A matching course already exists. Use it to avoid creating a duplicate.')}
                    </p>
                    {deletedMatches.length > 0 && (
                      <p>
                        {t(
                          'A matching course is in Deleted courses. Restore it on the Courses page before importing its syllabus.',
                        )}{' '}
                        <Link href="/courses" className="text-primary underline">
                          {t('Deleted courses')}
                        </Link>
                      </p>
                    )}
                    {duplicateCourses.map((match) => (
                      <div key={match.id}>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={match.archived}
                          onClick={() => {
                            if (lastPreview.current) showSuggestions(lastPreview.current, match);
                          }}
                        >
                          {t('Use existing course')}: {match.code} ·{' '}
                          {data.semesters.find((term) => term.id === match.semesterId)?.name}
                        </Button>
                        {match.archived && (
                          <p className="muted mt-1 text-xs">
                            {t('Unarchive this course first to import into it.')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </fieldset>
            )}
            <p className="muted text-sm">
              {rows.length
                ? `${rows.length} suggestions found.`
                : categories.length
                  ? t('Category totals found. Choose a grading rule below.')
                  : t(
                      'No assessments found. Try a clearer PDF or paste the grading and schedule sections, or add rows below.',
                    )}{' '}
              <T text="Compare these with the original syllabus. Category totals are shown separately from individual assessments." />
            </p>
            <p className="muted text-sm">
              <T text="Match calendar imports to existing assessments to avoid duplicates. Matches update only dates and weights; scores, progress, names and notes stay intact. Blank fields preserve existing dates and weights. For new assessments, blank weight means 0% and blank date means no deadline." />
            </p>
            <p className="muted text-sm">
              <T text="Times use your device time zone. A date with no time uses 23:59. Calendar sync can later replace the dates of calendar-linked assessments." />
            </p>
            {warnings.map((warning) => (
              <p key={warning} className="text-sm">
                {t(warning)}
              </p>
            ))}
          </div>
          {bestOfSuggestions.map((suggestion) => (
            <fieldset disabled={busy} key={suggestion.key}>
              <SyllabusBestOfSuggestion
                suggestion={suggestion}
                names={suggestion.assessmentIds.map(
                  (id) => ruleAssessments.find((a) => a.id === id)?.name || '',
                )}
                onApply={() => applyBestOf(suggestion)}
                onDismiss={() => setDismissedSuggestions((d) => [...d, suggestion.key])}
              />
            </fieldset>
          ))}
          {categories.map((category, index) => (
            <fieldset disabled={busy} key={`${category.name}:${index}`}>
              <SyllabusCategoryWeights
                category={category}
                assessments={ruleAssessments}
                rules={gradingRules}
                onApply={applyCategory}
              />
            </fieldset>
          ))}
          <fieldset disabled={busy}>
            <GradingRulesEditor
              rules={gradingRules}
              notes={gradingNotes}
              assessments={ruleAssessments}
              onChange={(rules, notes) => {
                setGradingRules(rules);
                setGradingNotes(notes);
                setReviewed(false);
              }}
            />
          </fieldset>
          {sessions.length > 0 && (
            <fieldset disabled={busy}>
              <SyllabusSessions
                key={reviewCourseCode}
                sessions={sessions}
                courseCode={reviewCourseCode}
                onChange={clearSessionDates}
                onConfirm={confirmSessions}
              />
            </fieldset>
          )}
          {sessionNotice !== '' && (
            <p role="status" className="text-sm text-primary">
              <T text="Session dates confirmed:" /> {sessionNotice}.{' '}
              <T text="Review the remaining rows below." />
            </p>
          )}
          {rows.map((row, index) => {
            const match = existing.find((item) => item.id === row.existingId);
            const gradingRule = resolveGradingRules(gradingRules, ruleAssessments).find((r) =>
              r.assessmentIds.includes(row.existingId || `import:${row.id}`),
            );
            return (
              <fieldset key={row.id} className="card min-w-0 space-y-4 p-4 sm:p-5" disabled={busy}>
                <legend className="px-2 text-sm font-semibold">
                  <T text="Assessment" /> {index + 1}
                </legend>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={(e) => update(row.id, { selected: e.target.checked })}
                  />
                  <T text="Include this assessment" />
                </label>
                <label className="block space-y-2 text-sm">
                  <span>
                    <T text="Save as" />
                  </span>
                  <select
                    className="input"
                    value={row.existingId}
                    onChange={(e) => matchRow(row, e.target.value)}
                  >
                    <option value="">
                      <T text="New assessment" />
                    </option>
                    {existing.map((a) => (
                      <option key={a.id} value={a.id}>
                        <T text="Update:" /> {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                {match && (
                  <p className="muted text-xs">
                    <T text="Current weight:" /> {match.weight}
                    <T text="%. Current deadline:" />{' '}
                    {match.dueDate
                      ? `${dateKey(match.dueDate)} ${toDateTimeLocal(match.dueDate).slice(11)}`
                      : 'none'}
                    .
                  </p>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span>
                      <T text="Name" />
                    </span>
                    <Input
                      value={row.name}
                      maxLength={200}
                      required={row.selected}
                      disabled={!!match}
                      onChange={(e) => update(row.id, { name: e.target.value })}
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span>
                      <T text="Type" />
                    </span>
                    <select
                      className="input"
                      value={row.type}
                      disabled={!!match}
                      onChange={(e) => update(row.id, { type: e.target.value as AssessmentType })}
                    >
                      {types.map((type) => (
                        <option key={type} value={type}>
                          {type.replaceAll('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {row.tentative && (
                  <p className="text-sm text-primary">
                    <T text="Tentative schedule — check course announcements." />
                  </p>
                )}
                {row.durationMinutes && (
                  <p className="muted text-sm">
                    <T text="Duration:" /> {row.durationMinutes} <T text="minutes" />
                  </p>
                )}
                {row.timing && (
                  <SyllabusSessionDate
                    timing={row.timing}
                    sessions={sessions}
                    exceptions={exceptions}
                    courseCode={reviewCourseCode}
                    chosen={row.chosenSession}
                    onChoose={(choice) =>
                      update(
                        row.id,
                        choice
                          ? { date: choice.date, time: choice.time, chosenSession: choice }
                          : { date: '', time: '', chosenSession: null },
                      )
                    }
                  />
                )}
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="space-y-2 text-sm">
                    <span>
                      <T text="Due date" />
                    </span>
                    <Input
                      type="date"
                      value={row.date}
                      onChange={(e) =>
                        update(row.id, { date: e.target.value, chosenSession: null })
                      }
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span>
                      <T text="Due time" />
                    </span>
                    <Input
                      type="time"
                      value={row.time}
                      onChange={(e) =>
                        update(row.id, { time: e.target.value, chosenSession: null })
                      }
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span>
                      <T text="Grade weight (%)" />
                    </span>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      placeholder={
                        match
                          ? t('Keep {weight}').replace('{weight}', t.percent(match.weight, 2))
                          : t('Not found')
                      }
                      value={row.weightText}
                      onChange={(e) => update(row.id, { weightText: e.target.value })}
                    />
                  </label>
                </div>
                {isPastDue(row) && (
                  <div className="space-y-1 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={markedDone(row)}
                        onChange={(e) => update(row.id, { alreadyDone: e.target.checked })}
                      />
                      <T text="This date has passed. Mark it as already done" />
                    </label>
                    <p className="muted text-xs">
                      <T text="Work due in the last week is left open in case you are still submitting it. Unticked past work shows as overdue; ticked work waits for its grade." />
                    </p>
                  </div>
                )}
                {gradingRule && (
                  <p className="text-sm text-primary">
                    {gradingRule.name}:{' '}
                    {gradingRule.mode === 'equal'
                      ? t('Automatic equal split')
                      : `${t('Best')} ${gradingRule.keep}/${gradingRule.assessmentIds.length}`}{' '}
                    · {t.percent(gradingRule.weight, 2)}.{' '}
                    <T text="This group replaces the individual weight above." />
                  </p>
                )}
                {!!row.warnings.length && (
                  <ul className="muted list-disc space-y-1 pl-5 text-xs">
                    {row.warnings
                      .filter(
                        (warning) =>
                          (!row.date || !warning.startsWith('Choose your session below')) &&
                          (!gradingRule || !warning.startsWith('No definite weight.')),
                      )
                      .map((warning) => (
                        <li key={warning}>{t(warning)}</li>
                      ))}
                  </ul>
                )}
                {row.source && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-primary">
                      <T text="View source excerpt" />
                      {row.page ? ` · page ${row.page}` : ''}
                    </summary>
                    <p className="muted mt-3 whitespace-pre-wrap break-words rounded-sm bg-[var(--muted)] p-3 leading-relaxed">
                      {row.source}
                    </p>
                  </details>
                )}
              </fieldset>
            );
          })}
          <Button
            type="button"
            variant="outline"
            disabled={busy || rows.length >= 100}
            onClick={() => {
              setRows([
                ...rows,
                {
                  id: nextId.current++,
                  name: '',
                  type: 'ASSIGNMENT',
                  date: '',
                  time: '',
                  weight: null,
                  weightText: '',
                  source: '',
                  warnings: [],
                  grouped: false,
                  existingId: '',
                  selected: true,
                },
              ]);
              setReviewed(false);
            }}
          >
            <Plus />
            <T text="Add missed assessment" />
          </Button>
          <div className="card space-y-4 p-4 sm:p-5">
            <h2 className="section-title">
              3. {mode === 'new' ? t('Create your course') : `Save to ${course?.code}`}
            </h2>
            <p className="text-sm">
              {selected.length} <T text="selected · Course weight after import:" />{' '}
              {Number.isFinite(total) ? formatPercent(total, t.locale, 2, 2) : '—'}
            </p>
            {ruleError && (
              <p role="alert" className="text-sm text-[var(--danger)]">
                {t(ruleError)}
              </p>
            )}
            {total > 100.000001 && (
              <p className="text-sm text-[var(--danger)]">
                <T text="Adjust weights or matches so the course total is at most 100%." />
              </p>
            )}
            <label className="flex items-start gap-3 text-sm leading-relaxed">
              <input
                type="checkbox"
                className="mt-1"
                required
                checked={reviewed}
                disabled={busy}
                onChange={(e) => setReviewed(e.target.checked)}
              />
              <span>
                <T text="I checked the course details, selected dates, times, individual weights and matches against my syllabus." />
              </span>
            </label>
            <Button
              disabled={
                busy ||
                Boolean(ruleError) ||
                !reviewed ||
                !semester ||
                (mode === 'new'
                  ? !courseCode.trim() || !courseName.trim() || Boolean(duplicateCourse)
                  : (!selected.length && !gradingRules.length) || !course) ||
                total > 100.000001
              }
            >
              {busy
                ? t('Saving…')
                : mode === 'new'
                  ? t('Create course and save assessments')
                  : t('Save reviewed assessments')}
            </Button>
            <p className="muted text-xs">
              <T text="This imports a snapshot. Later changes to your syllabus need another review." />
            </p>
          </div>
        </form>
      )}
      <Link className="inline-block text-sm text-primary underline" href="/guide#syllabus">
        <T text="Help with syllabus imports" />
      </Link>
    </div>
  );
}
